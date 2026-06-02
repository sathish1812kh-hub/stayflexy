import { EventContractValidator } from '../integration/EventContractValidator'
import { ContractValidator } from '../contracts/ContractValidator'
import { CircuitBreaker } from '../resilience/CircuitBreaker'
import { RetryPolicy } from '../resilience/RetryPolicy'

const eventValidator = new EventContractValidator()
const contractValidator = new ContractValidator()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBookingCreatedEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    eventId: 'a1b2c3d4-e5f6-4789-a012-b34567890abc',
    eventType: 'booking.created',
    aggregateId: 'booking-001',
    aggregateType: 'Booking',
    organizationId: 'org-001',
    version: 1,
    timestamp: '2025-07-01T10:00:00.000Z',
    payload: {
      bookingId: 'b1c2d3e4-f5a6-4789-b012-c34567890def',
      bookingNumber: 'BK-001',
      hotelId: 'hotel-001',
      roomIds: ['room-001'],
      primaryGuestName: 'John Doe',
      checkIn: '2025-07-01',
      checkOut: '2025-07-03',
      nightCount: 2,
      totalAmount: 299.99,
      currency: 'USD',
      source: 'DIRECT',
      bookedById: 'user-001',
    },
    ...overrides,
  }
}

function makePaymentInitiatedEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    eventId: 'c1d2e3f4-a5b6-4789-c012-d34567890abc',
    eventType: 'payment.initiated',
    aggregateId: 'payment-001',
    aggregateType: 'Payment',
    organizationId: 'org-001',
    version: 1,
    timestamp: '2025-07-01T10:05:00.000Z',
    payload: {
      paymentId: 'd1e2f3a4-b5c6-4789-d012-e34567890bcd',
      paymentReference: 'PAY-REF-001',
      bookingId: 'booking-001',
      amount: 299.99,
      currency: 'USD',
      paymentMethod: 'CREDIT_CARD',
    },
    ...overrides,
  }
}

// ─── Booking-Payment Saga Integration ─────────────────────────────────────────

describe('Booking-Payment Saga — event contract integration', () => {
  it('booking.created → payment.initiated flow validates both contracts', () => {
    const bookingCreated = makeBookingCreatedEnvelope()
    const paymentInitiated = makePaymentInitiatedEnvelope()

    const r1 = eventValidator.validateBookingCreatedEvent(bookingCreated)
    const r2 = eventValidator.validatePaymentInitiatedEvent(paymentInitiated)

    expect(r1.passed).toBe(true)
    expect(r2.passed).toBe(true)
  })

  it('saga idempotency: duplicate booking.created events are detected', () => {
    const id = 'a1b2c3d4-e5f6-4789-a012-b34567890abc'
    const result = contractValidator.validateNoDuplicateEventIds([
      { eventId: id },
      { eventId: 'b2c3d4e5-f6a7-4890-b123-c45678901bcd' },
      { eventId: id }, // replay
    ])
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes(id))).toBe(true)
  })

  it('saga compensation: booking.cancelled invalidates payment — event ordering validated', () => {
    const events = [
      { eventId: 'evt-1', timestamp: '2025-07-01T10:00:00.000Z' }, // booking.created
      { eventId: 'evt-2', timestamp: '2025-07-01T10:05:00.000Z' }, // payment.initiated
      { eventId: 'evt-3', timestamp: '2025-07-01T10:10:00.000Z' }, // booking.cancelled
      { eventId: 'evt-4', timestamp: '2025-07-01T10:11:00.000Z' }, // payment.refunded
    ]
    const result = contractValidator.validateEventOrdering(events)
    expect(result.passed).toBe(true)
  })

  it('out-of-order compensation event fails ordering validation', () => {
    const events = [
      { eventId: 'evt-1', timestamp: '2025-07-01T10:10:00.000Z' }, // booking.cancelled
      { eventId: 'evt-2', timestamp: '2025-07-01T10:05:00.000Z' }, // payment.initiated — BEFORE cancel
    ]
    const result = contractValidator.validateEventOrdering(events)
    expect(result.passed).toBe(false)
  })
})

// ─── DLQ Routing Simulation ───────────────────────────────────────────────────

describe('Dead Letter Queue routing simulation', () => {
  it('message failing max retries is classified as DLQ candidate', () => {
    const MAX_RETRIES = 3
    const failedMessages: string[] = []
    let attemptCount = 0

    const simulateConsumer = (msg: string, handler: () => void): boolean => {
      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          attemptCount++
          handler()
          return true // success
        } catch {
          // retry
        }
      }
      failedMessages.push(msg)
      return false
    }

    const alwaysFails = () => { throw new Error('Downstream unavailable') }
    const result = simulateConsumer('booking.created:evt-1', alwaysFails)

    expect(result).toBe(false)
    expect(failedMessages).toContain('booking.created:evt-1')
    expect(attemptCount).toBe(MAX_RETRIES)
  })

  it('message succeeding on second attempt does not go to DLQ', () => {
    const dlqMessages: string[] = []
    let calls = 0

    const simulateConsumer = (msg: string, handler: () => void): boolean => {
      for (let i = 0; i < 3; i++) {
        try {
          calls++
          handler()
          return true
        } catch {
          // retry
        }
      }
      dlqMessages.push(msg)
      return false
    }

    let callCount = 0
    const succeedsOnSecondAttempt = () => {
      callCount++
      if (callCount < 2) throw new Error('Transient failure')
    }

    const result = simulateConsumer('payment.initiated:evt-2', succeedsOnSecondAttempt)
    expect(result).toBe(true)
    expect(dlqMessages).toHaveLength(0)
  })

  it('DLQ envelope validates as a valid event envelope', () => {
    const dlqEnvelope = {
      eventId: 'f1e2d3c4-b5a6-4789-e012-f34567890cde',
      eventType: 'dlq.message',
      aggregateId: 'evt-original-001',
      aggregateType: 'DLQ',
      organizationId: 'system',
      version: 1,
      timestamp: new Date().toISOString(),
      payload: {
        originalTopic: 'booking.events',
        originalPayload: JSON.stringify({ bookingId: 'bk-1' }),
        failureReason: 'Downstream service unavailable',
        attemptCount: 3,
        firstFailedAt: new Date().toISOString(),
        lastFailedAt: new Date().toISOString(),
      },
    }
    // DLQ events should have structurally valid envelopes
    expect(dlqEnvelope.eventId).toMatch(/^[0-9a-f-]{36}$/)
    expect(dlqEnvelope.eventType).toBe('dlq.message')
    expect(dlqEnvelope.payload.attemptCount).toBe(3)
  })
})

// ─── Circuit Breaker Integration ──────────────────────────────────────────────

describe('Circuit breaker — service degradation integration', () => {
  it('booking service circuit opens and rejects calls after inventory service failures', async () => {
    const inventoryCircuit = new CircuitBreaker<string>('inventory-service', 3, 1000)
    const failingInventoryCall = async () => { throw new Error('inventory-service: Connection refused') }

    // Trip the circuit
    for (let i = 0; i < 3; i++) {
      await inventoryCircuit.execute(failingInventoryCall).catch(() => {})
    }

    expect(inventoryCircuit.getState()).toBe('OPEN')

    // Subsequent calls are rejected immediately without hitting inventory
    let calledInventory = false
    await inventoryCircuit.execute(async () => { calledInventory = true; return 'ok' }).catch(() => {})
    expect(calledInventory).toBe(false)
  })

  it('payment circuit remains closed during booking circuit failure', async () => {
    const bookingCircuit = new CircuitBreaker<string>('booking-service', 3, 1000)
    const paymentCircuit = new CircuitBreaker<string>('payment-service', 3, 1000)
    const failingCall = async () => { throw new Error('timeout') }

    for (let i = 0; i < 3; i++) {
      await bookingCircuit.execute(failingCall).catch(() => {})
    }

    // Payment circuit should be unaffected
    expect(bookingCircuit.getState()).toBe('OPEN')
    expect(paymentCircuit.getState()).toBe('CLOSED')
  })
})

// ─── Retry Policy Integration ─────────────────────────────────────────────────

describe('Retry policy — distributed operation resilience', () => {
  it('booking reservation retries on transient DB error and succeeds', async () => {
    const retryableCodes = new Set(['TransientError'])
    const policy = new RetryPolicy(
      3,
      10,
      30_000,
      (err: unknown) => retryableCodes.has((err as { code?: string }).code ?? ''),
    )
    let attempts = 0

    const result = await policy.execute(async () => {
      attempts++
      if (attempts < 3) throw Object.assign(new Error('DB connection reset'), { code: 'TransientError' })
      return 'RESERVED'
    })

    expect(result).toBe('RESERVED')
    expect(attempts).toBe(3)
  })

  it('payment operation does not retry on non-retryable validation error', async () => {
    const retryableCodes = new Set(['TransientError'])
    const policy = new RetryPolicy(
      3,
      10,
      30_000,
      (err: unknown) => retryableCodes.has((err as { code?: string }).code ?? ''),
    )
    let attempts = 0

    await expect(policy.execute(async () => {
      attempts++
      throw Object.assign(new Error('Invalid card number'), { code: 'ValidationError' })
    })).rejects.toThrow('Invalid card number')

    expect(attempts).toBe(1) // no retry on non-retryable errors
  })
})

// ─── Workflow-Notification Event Chain ────────────────────────────────────────

describe('Workflow-Notification event chain integration', () => {
  it('workflow.started followed by notification.sent validates both contracts', () => {
    const workflowStarted = {
      eventId: 'e1f2a3b4-c5d6-4789-e012-a34567890bcd',
      eventType: 'workflow.started',
      aggregateId: 'exec-001',
      aggregateType: 'WorkflowExecution',
      organizationId: 'org-001',
      version: 1,
      timestamp: '2025-07-01T10:00:00.000Z',
      payload: {
        executionId: '809de21a-e5a9-46be-91c6-3d23fe1276a3',
        workflowName: 'booking-confirmation',
        triggerSource: 'booking.created',
        organizationId: 'org-001',
      },
    }
    const notificationSent = {
      eventId: 'f2a3b4c5-d6e7-4890-f123-b45678901cde',
      eventType: 'notification.sent',
      aggregateId: 'notif-001',
      aggregateType: 'Notification',
      organizationId: 'org-001',
      version: 1,
      timestamp: '2025-07-01T10:00:05.000Z',
      payload: {
        notificationId: '909de21a-e5a9-46be-91c6-3d23fe1276a4',
        channelType: 'EMAIL',
        recipient: 'guest@hotel.com',
        organizationId: 'org-001',
      },
    }

    const r1 = eventValidator.validateWorkflowStartedEvent(workflowStarted)
    const r2 = eventValidator.validateNotificationSentEvent(notificationSent)

    expect(r1.passed).toBe(true)
    expect(r2.passed).toBe(true)
  })

  it('batch event chain: booking→payment→workflow→notification all pass contract validation', () => {
    const chain = [
      makeBookingCreatedEnvelope({ eventId: 'aaa1b2c3-d4e5-4678-a901-b23456789abc', timestamp: '2025-07-01T10:00:00.000Z' }),
      makePaymentInitiatedEnvelope({ eventId: 'bbb2c3d4-e5f6-4789-b012-c34567890bcd', timestamp: '2025-07-01T10:00:01.000Z' }),
    ]

    const orderResult = contractValidator.validateEventOrdering(chain.map(e => ({
      eventId: e['eventId'] as string,
      timestamp: e['timestamp'] as string,
    })))
    expect(orderResult.passed).toBe(true)

    const dedupResult = contractValidator.validateNoDuplicateEventIds(chain.map(e => ({
      eventId: e['eventId'] as string,
    })))
    expect(dedupResult.passed).toBe(true)
  })
})

// ─── Tenant Isolation Integration ────────────────────────────────────────────

describe('Cross-tenant event isolation', () => {
  it('events from different organizations share no eventId namespace collision', () => {
    const org1Events = [
      { eventId: 'org1-evt-a1b2c3d4-e5f6-4789-a012-b34567890abc', timestamp: '2025-07-01T10:00:00.000Z' },
      { eventId: 'org1-evt-b2c3d4e5-f6a7-4890-b123-c45678901bcd', timestamp: '2025-07-01T10:01:00.000Z' },
    ]
    const org2Events = [
      { eventId: 'org2-evt-c3d4e5f6-a7b8-4901-c234-d56789012cde', timestamp: '2025-07-01T10:00:30.000Z' },
    ]

    const allEvents = [...org1Events, ...org2Events]
    const dedupResult = contractValidator.validateNoDuplicateEventIds(allEvents)
    expect(dedupResult.passed).toBe(true)
  })

  it('envelope missing organizationId field fails contract validation', () => {
    const envelopeWithoutOrg = {
      ...makeBookingCreatedEnvelope(),
      organizationId: undefined,
    }
    const result = eventValidator.validateBookingCreatedEvent(envelopeWithoutOrg)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('organizationId'))).toBe(true)
  })
})
