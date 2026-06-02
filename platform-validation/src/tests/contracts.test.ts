import { ContractValidator } from '../contracts/ContractValidator'
import { createEnvelopeSchema } from '../contracts/schemas/EventEnvelopeSchema'
import {
  BookingCreatedPayloadSchema,
} from '../contracts/schemas/BookingEventSchemas'
import { PaymentInitiatedPayloadSchema } from '../contracts/schemas/PaymentEventSchemas'

const contractValidator = new ContractValidator()

function makeValidBookingCreatedEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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

function makeValidPaymentInitiatedEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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

const bookingCreatedSchema = createEnvelopeSchema(BookingCreatedPayloadSchema)
const paymentInitiatedSchema = createEnvelopeSchema(PaymentInitiatedPayloadSchema)

describe('ContractValidator — BookingCreatedEvent', () => {
  it('valid BookingCreatedEvent envelope passes validation', () => {
    const envelope = makeValidBookingCreatedEnvelope()
    const result = contractValidator.validateEnvelope(envelope, bookingCreatedSchema, 'BookingCreatedEvent')
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('invalid BookingCreatedEvent with missing bookingId in payload fails', () => {
    const envelope = makeValidBookingCreatedEnvelope()
    const payload = (envelope['payload'] as Record<string, unknown>)
    const { bookingId: _removed, ...payloadWithoutId } = payload
    envelope['payload'] = payloadWithoutId
    const result = contractValidator.validateEnvelope(envelope, bookingCreatedSchema, 'BookingCreatedEvent')
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('bookingId'))).toBe(true)
  })

  it('invalid eventId (not UUID) fails validation', () => {
    const envelope = makeValidBookingCreatedEnvelope({ eventId: 'not-a-uuid' })
    const result = contractValidator.validateEnvelope(envelope, bookingCreatedSchema, 'BookingCreatedEvent')
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('eventId'))).toBe(true)
  })

  it('invalid timestamp (not ISO datetime) fails validation', () => {
    const envelope = makeValidBookingCreatedEnvelope({ timestamp: '2025-07-01' })
    const result = contractValidator.validateEnvelope(envelope, bookingCreatedSchema, 'BookingCreatedEvent')
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('timestamp'))).toBe(true)
  })
})

describe('ContractValidator — PaymentInitiatedEvent', () => {
  it('PaymentInitiatedEvent with negative amount fails validation', () => {
    const envelope = makeValidPaymentInitiatedEnvelope()
    const payload = envelope['payload'] as Record<string, unknown>
    payload['amount'] = -50
    const result = contractValidator.validateEnvelope(envelope, paymentInitiatedSchema, 'PaymentInitiatedEvent')
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('amount'))).toBe(true)
  })

  it('valid PaymentInitiatedEvent envelope passes validation', () => {
    const envelope = makeValidPaymentInitiatedEnvelope()
    const result = contractValidator.validateEnvelope(envelope, paymentInitiatedSchema, 'PaymentInitiatedEvent')
    expect(result.passed).toBe(true)
  })
})

describe('ContractValidator — validateNoDuplicateEventIds', () => {
  it('catches duplicate eventIds', () => {
    const envelopes = [
      { eventId: 'uuid-1' },
      { eventId: 'uuid-2' },
      { eventId: 'uuid-1' }, // duplicate
    ]
    const result = contractValidator.validateNoDuplicateEventIds(envelopes)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('uuid-1'))).toBe(true)
  })

  it('passes for unique eventIds', () => {
    const envelopes = [
      { eventId: 'uuid-1' },
      { eventId: 'uuid-2' },
      { eventId: 'uuid-3' },
    ]
    const result = contractValidator.validateNoDuplicateEventIds(envelopes)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('ContractValidator — validateEventOrdering', () => {
  it('catches out-of-order timestamps', () => {
    const events = [
      { eventId: 'e1', timestamp: '2025-07-01T10:00:00.000Z' },
      { eventId: 'e2', timestamp: '2025-07-01T11:00:00.000Z' },
      { eventId: 'e3', timestamp: '2025-07-01T09:00:00.000Z' }, // out of order
    ]
    const result = contractValidator.validateEventOrdering(events)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('e3'))).toBe(true)
  })

  it('passes for correctly ordered timestamps', () => {
    const events = [
      { eventId: 'e1', timestamp: '2025-07-01T09:00:00.000Z' },
      { eventId: 'e2', timestamp: '2025-07-01T10:00:00.000Z' },
      { eventId: 'e3', timestamp: '2025-07-01T11:00:00.000Z' },
    ]
    const result = contractValidator.validateEventOrdering(events)
    expect(result.passed).toBe(true)
  })
})

describe('ContractValidator — validateEnvelopeBatch', () => {
  it('batch validation catches all errors across multiple envelopes', () => {
    const envelopes = [
      makeValidBookingCreatedEnvelope(),
      makeValidBookingCreatedEnvelope({ eventId: 'bad-id' }),
      makeValidBookingCreatedEnvelope({ version: -1 }),
    ]
    const result = contractValidator.validateEnvelopeBatch(envelopes, bookingCreatedSchema, 'BookingCreatedEvent')
    expect(result.passed).toBe(false)
    // Should have errors from both invalid envelopes (index 1 and 2)
    expect(result.errors.some(e => e.startsWith('[1]'))).toBe(true)
    expect(result.errors.some(e => e.startsWith('[2]'))).toBe(true)
  })

  it('batch validation passes when all envelopes are valid', () => {
    const envelopes = [
      makeValidBookingCreatedEnvelope(),
      makeValidBookingCreatedEnvelope({ eventId: 'f1a2b3c4-d5e6-4789-f012-a34567890bcd' }),
    ]
    const result = contractValidator.validateEnvelopeBatch(envelopes, bookingCreatedSchema, 'BookingCreatedEvent')
    expect(result.passed).toBe(true)
  })
})
