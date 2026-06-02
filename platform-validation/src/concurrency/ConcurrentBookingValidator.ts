import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export interface OverbookingResult {
  availableRooms: number
  concurrentAttempts: number
  successfulBookings: number
  rejectedBookings: number
  overbookingOccurred: boolean
}

export class ConcurrentBookingValidator {
  // Given a booking function that returns true on success, false if room unavailable,
  // verifies successful bookings never exceed available rooms.
  async validateOverbookingPrevention(
    availableRooms: number,
    concurrentAttempts: number,
    bookingFn: (attemptIndex: number) => Promise<boolean>,
  ): Promise<ValidationResult & { overbookingResult: OverbookingResult }> {
    const start = Date.now()
    const results = await Promise.allSettled(
      Array.from({ length: concurrentAttempts }, (_, i) => bookingFn(i)),
    )

    const successfulBookings = results.filter(
      r => r.status === 'fulfilled' && r.value === true,
    ).length

    const overbookingOccurred = successfulBookings > availableRooms
    const passed = !overbookingOccurred

    const overbookingResult: OverbookingResult = {
      availableRooms,
      concurrentAttempts,
      successfulBookings,
      rejectedBookings: concurrentAttempts - successfulBookings,
      overbookingOccurred,
    }

    const baseResult = createResult(
      'OverbookingPrevention',
      passed,
      `${successfulBookings}/${concurrentAttempts} succeeded (${availableRooms} available)`,
      overbookingOccurred
        ? [`OVERBOOKING: ${successfulBookings} bookings for ${availableRooms} rooms`]
        : [],
      [],
      Date.now() - start,
    )

    return { ...baseResult, overbookingResult }
  }

  // Validates duplicate booking prevention (idempotency)
  async validateIdempotentBooking(
    bookingFn: (idempotencyKey: string) => Promise<string>,
    idempotencyKey: string,
    concurrentAttempts: number,
  ): Promise<ValidationResult> {
    const start = Date.now()
    const results = await Promise.allSettled(
      Array.from({ length: concurrentAttempts }, () => bookingFn(idempotencyKey)),
    )

    const bookingIds = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<string>).value)

    const uniqueIds = new Set(bookingIds)
    const passed = uniqueIds.size === 1

    return createResult(
      'IdempotentBooking',
      passed,
      `${concurrentAttempts} attempts with same key produced ${uniqueIds.size} unique booking(s)`,
      passed ? [] : [`Expected 1 unique booking, got ${uniqueIds.size}: ${[...uniqueIds].join(', ')}`],
      [],
      Date.now() - start,
    )
  }
}
