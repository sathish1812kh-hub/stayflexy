import { ConcurrentBookingValidator } from '../concurrency/ConcurrentBookingValidator'
import { DistributedLockValidator } from '../concurrency/DistributedLockValidator'
import { CacheConsistencyValidator } from '../concurrency/CacheConsistencyValidator'

describe('ConcurrentBookingValidator', () => {
  let bookingValidator: ConcurrentBookingValidator

  beforeEach(() => {
    bookingValidator = new ConcurrentBookingValidator()
  })

  it('overbooking prevention: only 3 out of 5 concurrent bookings succeed for 3 rooms', async () => {
    const availableRooms = 3
    let booked = 0

    // Simulate atomic counter: only first `availableRooms` succeed
    const bookingFn = async (_idx: number): Promise<boolean> => {
      if (booked < availableRooms) {
        booked++
        return true
      }
      return false
    }

    const result = await bookingValidator.validateOverbookingPrevention(availableRooms, 5, bookingFn)
    expect(result.passed).toBe(true)
    expect(result.overbookingResult.successfulBookings).toBeLessThanOrEqual(availableRooms)
    expect(result.overbookingResult.overbookingOccurred).toBe(false)
  })

  it('idempotent booking: 5 concurrent requests with same key produce 1 unique booking ID', async () => {
    const fixedBookingId = 'booking-idempotent-001'
    const bookingFn = async (_key: string): Promise<string> => fixedBookingId

    const result = await bookingValidator.validateIdempotentBooking(bookingFn, 'key-abc', 5)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('non-idempotent booking: unique IDs per call causes failure', async () => {
    let counter = 0
    const bookingFn = async (_key: string): Promise<string> => `booking-${++counter}`

    const result = await bookingValidator.validateIdempotentBooking(bookingFn, 'key-xyz', 5)
    expect(result.passed).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('DistributedLockValidator', () => {
  let lockValidator: DistributedLockValidator

  beforeEach(() => {
    lockValidator = new DistributedLockValidator()
  })

  it('mutual exclusion: in-memory lock store prevents concurrent lock holding', async () => {
    const result = await lockValidator.validateMutualExclusion(10)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('lock expiry: lock becomes unavailable after TTL elapses', async () => {
    const result = await lockValidator.validateLockExpiry(30) // 30ms TTL
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('ownership enforcement: wrong owner cannot release the lock', async () => {
    const result = await lockValidator.validateOwnershipEnforcement()
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('deadlock prevention: resources acquired in sorted order', async () => {
    const result = await lockValidator.validateDeadlockPrevention(5)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('CacheConsistencyValidator', () => {
  let cacheValidator: CacheConsistencyValidator

  beforeEach(() => {
    cacheValidator = new CacheConsistencyValidator()
  })

  it('cache invalidation on update: value is absent after delete and updated after re-write', () => {
    const result = cacheValidator.validateCacheInvalidationOnUpdate()
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('TTL expiry: entry is present before TTL and set to expire in future', () => {
    const result = cacheValidator.validateTTLExpiry(5000)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('stale read prevention: version-based cache returns the latest version', () => {
    const result = cacheValidator.validateStaleReadPrevention()
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
