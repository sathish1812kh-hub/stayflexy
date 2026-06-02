import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IBookingRepository, FullBooking } from '../../domain/repositories/IBookingRepository'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { BookingCache } from '../../infrastructure/cache/BookingCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { CancelBookingDto } from '../dtos/booking.dto'
import { DateRange } from '../../domain/value-objects/DateRange'

export class CancelBooking {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly inventoryRepo: IInventoryRepository,
    private readonly cache: BookingCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(bookingId: string, dto: CancelBookingDto, userId: string, organizationId: string, correlationId?: string): Promise<FullBooking> {
    const result = await this.bookingRepo.findByIdWithDetails(bookingId)
    if (!result) throw new NotFoundError('Booking not found')
    if (!result.booking.belongsToOrganization(organizationId)) throw new ForbiddenError('Access denied')
    if (!result.booking.canBeCancelled()) {
      throw new BadRequestError(`Cannot cancel booking with status "${result.booking.status}". Only PENDING, CONFIRMED, or NO_SHOW bookings can be cancelled.`)
    }

    await this.bookingRepo.updateStatus(bookingId, 'CANCELLED', {
      cancelledAt: new Date(), cancelledById: userId,
      cancellationReason: dto.cancellationReason, cancellationNote: dto.cancellationNote,
    })
    await this.bookingRepo.updateRoomStatuses(bookingId, 'CANCELLED')
    await this.bookingRepo.addAuditEntry(bookingId, 'CANCELLED', `Booking cancelled. Reason: ${dto.cancellationReason}`, userId, { reason: dto.cancellationReason, note: dto.cancellationNote })

    // Release inventory for active rooms
    for (const room of result.rooms) {
      if (room.isActive) {
        try {
          const dateRange = DateRange.create(room.checkInDate, room.checkOutDate)
          await this.inventoryRepo.releaseInventory(room.roomTypeId, dateRange.checkIn, dateRange.checkOut)
        } catch (err) { this.logger.error({ err, roomId: room.roomId }, 'Failed to release inventory on cancel') }
      }
    }

    await this.cache.invalidate(bookingId)

    this.eventPublisher.publish('booking.events', {
      eventType: 'booking.cancelled', aggregateId: bookingId, aggregateType: 'Booking',
      organizationId, correlationId,
      payload: { bookingId, hotelId: result.booking.hotelId, cancellationReason: dto.cancellationReason, cancelledById: userId },
    }).catch(err => this.logger.warn({ err }, 'Failed to publish booking.cancelled'))

    this.logger.info({ bookingId, correlationId }, 'Booking cancelled')
    const updated = await this.bookingRepo.findByIdWithDetails(bookingId)
    return updated ?? result
  }
}
