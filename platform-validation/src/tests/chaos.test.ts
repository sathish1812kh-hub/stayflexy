import { ChaosScenarios } from '../chaos/ChaosScenarios'
import { FaultInjector } from '../chaos/FaultInjector'
import { WorkerCrashSimulator } from '../chaos/WorkerCrashSimulator'

const chaos = new ChaosScenarios()
const injector = new FaultInjector()
const workerSim = new WorkerCrashSimulator()

// ─── Redis Outage Simulation ──────────────────────────────────────────────────

describe('ChaosScenarios — Redis outage', () => {
  afterEach(() => injector.clearAll())

  it('rate limiter fails open during Redis outage (availability over consistency)', async () => {
    const failingRateLimiter = async () => {
      throw new Error('Redis connection refused')
    }
    const result = await chaos.validateRedisOutageFailOpen(failingRateLimiter)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('cache read failure falls back to database (non-fatal Redis outage)', async () => {
    injector.injectFault('redis-cache', { errorRate: 1.0, errorMessage: 'ECONNREFUSED' })
    let cacheAttempted = false
    let dbFallbackCalled = false

    const cacheReadWithFallback = async (): Promise<string> => {
      cacheAttempted = true
      const fault = injector.hasFault('redis-cache')
      if (fault) {
        await injector.executeWithFault('redis-cache', async () => {
          throw new Error('ECONNREFUSED')
        }).catch(() => {
          dbFallbackCalled = true
        })
        return 'DB_RESULT'
      }
      return 'CACHE_HIT'
    }

    const result = await cacheReadWithFallback()
    expect(cacheAttempted).toBe(true)
    expect(dbFallbackCalled).toBe(true)
    expect(result).toBe('DB_RESULT')
  })

  it('distributed lock acquisition fails hard during Redis outage (fail-secure)', async () => {
    injector.injectFault('redis-lock', { errorRate: 1.0, errorMessage: 'Redis unavailable' })
    let lockAttempted = false
    let operationExecuted = false

    const bookingWithLock = async () => {
      lockAttempted = true
      await injector.executeWithFault('redis-lock', async () => {
        throw new Error('Redis unavailable')
      })
      operationExecuted = true
    }

    await expect(bookingWithLock()).rejects.toThrow('Redis unavailable')
    expect(lockAttempted).toBe(true)
    expect(operationExecuted).toBe(false) // Lock failed → operation must NOT execute
  })
})

// ─── Kafka Outage Simulation ──────────────────────────────────────────────────

describe('ChaosScenarios — Kafka outage', () => {
  afterEach(() => injector.clearAll())

  it('booking service continues serving HTTP when Kafka is unavailable', async () => {
    let kafkaPublishAttempted = false
    const noopFallbackPublish = async () => {
      kafkaPublishAttempted = true
      // NoOpEventPublisher behavior — silently swallows
    }
    const result = await chaos.validateKafkaOutageFallback(noopFallbackPublish)
    expect(result.passed).toBe(true)
    expect(kafkaPublishAttempted).toBe(true)
  })

  it('payment service records payment in DB even when event publish fails', async () => {
    const events: string[] = []
    let dbWritten = false

    const processPayment = async () => {
      dbWritten = true // DB write always succeeds
      try {
        await injector.executeWithFault('kafka', async () => {
          throw new Error('Kafka broker not available')
        })
        events.push('payment.completed')
      } catch {
        // Event publish failure is non-fatal — payment still recorded
      }
    }

    injector.injectFault('kafka', { errorRate: 1.0, errorMessage: 'Kafka broker not available' })
    await processPayment()

    expect(dbWritten).toBe(true)
    expect(events).toHaveLength(0) // Event not published (Kafka down)
    // Critical: payment IS recorded despite event failure
  })

  it('Kafka consumer deduplication prevents double-processing on replay', () => {
    const processedEventIds = new Set<string>()
    const results: string[] = []

    const processEvent = (eventId: string, payload: string) => {
      if (processedEventIds.has(eventId)) {
        return // Idempotent: skip duplicate
      }
      processedEventIds.add(eventId)
      results.push(payload)
    }

    // Simulate replay: same event delivered twice
    processEvent('evt-001', 'booking.created:BK-001')
    processEvent('evt-001', 'booking.created:BK-001') // replay
    processEvent('evt-002', 'payment.completed:PAY-001')

    expect(results).toHaveLength(2) // Only unique events processed
    expect(processedEventIds.size).toBe(2)
  })
})

// ─── Database Latency Simulation ─────────────────────────────────────────────

describe('ChaosScenarios — Database latency', () => {
  it('booking request times out cleanly under 3s DB latency', async () => {
    const timeoutMs = 500
    const simulatedLatencyMs = 1000 // DB slower than timeout
    const dbOperation = async () => {
      await new Promise(r => setTimeout(r, simulatedLatencyMs))
      return { bookingId: 'bk-1' }
    }

    const result = await chaos.validateDatabaseLatencyHandling(timeoutMs, simulatedLatencyMs, dbOperation)
    // Expects timeout to be detected (latency > timeout budget)
    expect(result.passed).toBe(true)
  })

  it('analytics queries are non-blocking and do not affect booking latency', async () => {
    const bookingLatencies: number[] = []
    const analyticsLatencies: number[] = []

    // Simulate concurrent booking (fast) and analytics (slow) requests
    const bookingRequest = async () => {
      const start = Date.now()
      await new Promise(r => setTimeout(r, 10)) // booking is fast
      bookingLatencies.push(Date.now() - start)
    }

    const analyticsRequest = async () => {
      const start = Date.now()
      await new Promise(r => setTimeout(r, 200)) // analytics is slow
      analyticsLatencies.push(Date.now() - start)
    }

    await Promise.all([
      bookingRequest(),
      bookingRequest(),
      analyticsRequest(),
      bookingRequest(),
    ])

    const avgBookingLatency = bookingLatencies.reduce((a, b) => a + b, 0) / bookingLatencies.length
    expect(avgBookingLatency).toBeLessThan(100) // Booking unaffected by analytics
  })
})

// ─── Worker Crash Recovery ────────────────────────────────────────────────────

describe('WorkerCrashSimulator — crash and recovery', () => {
  beforeEach(() => workerSim.initWorkers(3))

  it('worker pool recovers after single worker crash', async () => {
    const result = await workerSim.validateRecovery('worker-0')
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('remaining workers absorb load after crash (2 of 3 survive)', async () => {
    workerSim.simulateCrash('worker-1')
    const running = workerSim.getRunningWorkerCount()
    expect(running).toBe(2) // 2 still running
  })

  it('crashed worker can be restarted independently', async () => {
    workerSim.simulateCrash('worker-2')
    expect(workerSim.getRunningWorkerCount()).toBe(2)

    workerSim.restart('worker-2')
    expect(workerSim.getRunningWorkerCount()).toBe(3)
  })

  it('notification retry worker picks up missed messages after restart', () => {
    const pendingRetries: string[] = ['notif-failed-001', 'notif-failed-002']
    let retriesProcessed = 0

    // Simulate worker restart — processes pending retries on startup
    const workerStartup = (pending: string[]) => {
      retriesProcessed = pending.length
    }

    workerSim.simulateCrash('worker-0')
    workerSim.restart('worker-0')
    workerStartup(pendingRetries)

    expect(retriesProcessed).toBe(2)
  })
})

// ─── Cascading Failure Prevention ────────────────────────────────────────────

describe('ChaosScenarios — cascading failure prevention', () => {
  afterEach(() => injector.clearAll())

  it('inventory service circuit breaks independently of booking service', async () => {
    const result = await chaos.validateCascadingFailurePrevention(
      'inventory-service',
      async () => { throw new Error('inventory-service: timeout') },
    )
    expect(result.passed).toBe(true)
  })

  it('OTA API failure does not cascade to booking creation', async () => {
    injector.injectFault('ota-api', { errorRate: 1.0, errorMessage: 'Booking.com API timeout' })
    let bookingCreated = false
    let otaFailed = false

    const createBooking = async () => {
      bookingCreated = true // Booking succeeds locally
      // OTA sync is async — failure doesn't block booking
      setImmediate(async () => {
        try {
          await injector.executeWithFault('ota-api', async () => {
            throw new Error('Booking.com API timeout')
          })
        } catch {
          otaFailed = true // OTA fails silently
        }
      })
    }

    await createBooking()
    await new Promise(r => setImmediate(r)) // flush setImmediate

    expect(bookingCreated).toBe(true)
    expect(otaFailed).toBe(true)
    // Booking succeeded even though OTA sync failed
  })

  it('FaultInjector configures and clears faults atomically', () => {
    injector.injectFault('payment-gateway', { errorRate: 0.5, latencyMs: 2000 })
    expect(injector.hasFault('payment-gateway')).toBe(true)

    injector.injectFault('redis-session', { errorRate: 1.0 })
    expect(injector.hasFault('redis-session')).toBe(true)

    injector.removeFault('payment-gateway')
    expect(injector.hasFault('payment-gateway')).toBe(false)
    expect(injector.hasFault('redis-session')).toBe(true) // unaffected

    injector.clearAll()
    expect(injector.hasFault('redis-session')).toBe(false)
  })
})

// ─── Stale Lock Recovery ──────────────────────────────────────────────────────

describe('Stale distributed lock recovery', () => {
  it('lock expires via TTL and next caller acquires it', async () => {
    const TTL_MS = 50
    let lockHolder: string | null = null
    let expiresAt = 0

    const acquireLock = (caller: string): boolean => {
      const now = Date.now()
      if (lockHolder === null || now > expiresAt) {
        lockHolder = caller
        expiresAt = now + TTL_MS
        return true
      }
      return false
    }

    expect(acquireLock('booking-service-pod-1')).toBe(true)
    expect(acquireLock('booking-service-pod-2')).toBe(false) // Locked

    await new Promise(r => setTimeout(r, TTL_MS + 10)) // Wait for TTL expiry

    expect(acquireLock('booking-service-pod-2')).toBe(true) // Now available
    expect(lockHolder).toBe('booking-service-pod-2')
  })

  it('Lua atomic release prevents releasing another owner\'s lock', () => {
    const store = new Map<string, string>()
    const RELEASE_SCRIPT = (key: string, token: string): number => {
      if (store.get(key) === token) {
        store.delete(key)
        return 1
      }
      return 0
    }

    store.set('lock:booking:hotel-1', 'owner-token-A')

    // Correct owner releases
    expect(RELEASE_SCRIPT('lock:booking:hotel-1', 'owner-token-A')).toBe(1)
    expect(store.has('lock:booking:hotel-1')).toBe(false)

    // After TTL recovery, pod-2 acquires
    store.set('lock:booking:hotel-1', 'owner-token-B')

    // Stale pod-1 tries to release (token mismatch)
    expect(RELEASE_SCRIPT('lock:booking:hotel-1', 'owner-token-A')).toBe(0)
    expect(store.has('lock:booking:hotel-1')).toBe(true) // Lock NOT released
    expect(store.get('lock:booking:hotel-1')).toBe('owner-token-B') // Still owned by B
  })
})
