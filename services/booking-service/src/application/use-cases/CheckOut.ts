import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IBookingRepository, FullBooking } from '../../domain/repositories/IBookingRepository'
import type { BookingCache } from '../../infrastructure/cache/BookingCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

export class CheckOut {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly cache: BookingCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(bookingId: string, userId: string, organizationId: string, correlationId?: string): Promise<FullBooking> {
    const result = await this.bookingRepo.findByIdWithDetails(bookingId)
    if (!result) throw new NotFoundError('Booking not found')
    if (!result.booking.belongsToOrganization(organizationId)) throw new ForbiddenError('Access denied')
    if (!result.booking.canCheckOut()) throw new BadRequestError(`Cannot check out booking with status "${result.booking.status}"`)

    const now = new Date()
    const updated = await this.bookingRepo.updateStatus(bookingId, 'CHECKED_OUT', { checkedOutAt: now, checkedOutById: userId })
    await this.bookingRepo.updateRoomStatuses(bookingId, 'VACATED')
    await this.bookingRepo.addAuditEntry(bookingId, 'CHECKED_OUT', 'Guest checked out', userId)
    await this.cache.invalidate(bookingId)

    this.eventPublisher.publish('booking.events', {
      eventType: 'booking.checked_out', aggregateId: bookingId, aggregateType: 'Booking',
      organizationId, correlationId,
      payload: { bookingId, hotelId: updated.hotelId, checkedOutAt: now.toISOString(), checkedOutById: userId },
    }).catch(err => this.logger.warn({ err }, 'Failed to publish checked_out event'))

    this.logger.info({ bookingId, correlationId }, 'Booking checked out')
    return { booking: updated, rooms: result.rooms, guests: result.guests }
  }
}
