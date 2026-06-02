import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IBookingRepository, FullBooking } from '../../domain/repositories/IBookingRepository'
import type { BookingCache } from '../../infrastructure/cache/BookingCache'

export class GetBooking {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly cache: BookingCache
  ) {}

  async execute(bookingId: string, organizationId: string): Promise<FullBooking> {
    const cached = await this.cache.get(bookingId)
    if (cached) {
      if (!cached.booking.belongsToOrganization(organizationId)) throw new ForbiddenError('Access denied', 'BOOKING_ACCESS_DENIED')
      return cached
    }
    const result = await this.bookingRepo.findByIdWithDetails(bookingId)
    if (!result || result.booking.isDeleted) throw new NotFoundError('Booking not found')
    if (!result.booking.belongsToOrganization(organizationId)) throw new ForbiddenError('Access denied', 'BOOKING_ACCESS_DENIED')
    await this.cache.set(bookingId, result)
    return result
  }
}
