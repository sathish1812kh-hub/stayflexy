import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IBookingRepository, FullBooking } from '../../domain/repositories/IBookingRepository'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { BookingCache } from '../../infrastructure/cache/BookingCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { CancelBookingDto } from '../dtos/booking.dto'
import { DateRange } from '../../domain/value-objects/DateRange'
import type { FindApplicableCancellationPolicy } from './FindApplicableCancellationPolicy'
import type { CancellationPolicy } from '../../domain/entities/CancellationPolicy'

export class CancelBooking {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly inventoryRepo: IInventoryRepository,
    private readonly cache: BookingCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
    private readonly findCancellationPolicy: FindApplicableCancellationPolicy,
  ) {}

  async execute(
    bookingId: string,
    dto: CancelBookingDto,
    userId: string,
    organizationId: string,
    correlationId?: string,
  ): Promise<FullBooking> {
    const result = await this.bookingRepo.findByIdWithDetails(bookingId)
    if (!result) throw new NotFoundError('Booking not found')
    if (!result.booking.belongsToOrganization(organizationId))
      throw new ForbiddenError('Access denied')
    if (!result.booking.canBeCancelled()) {
      throw new BadRequestError(
        `Cannot cancel booking with status "${result.booking.status}". Only PENDING, CONFIRMED, or NO_SHOW bookings can be cancelled.`,
      )
    }

    // Verify cancellation policy
    try {
      const policyEntity = await this.findCancellationPolicy.execute(
        organizationId,
        result.booking.hotelId,
        result.booking.source,
        result.booking.ratePlanId ?? undefined,
      )
      const checkInDate = result.rooms[0]?.checkInDate ?? new Date()
      const canCancel = policyEntity.canCancel(checkInDate)
      if (!canCancel.allowed) {
        throw new BadRequestError(`Cancellation not allowed: ${canCancel.reason}`)
      }
      const refund = policyEntity.calculateRefund(result.booking.amounts.finalAmount, checkInDate)
      // Store refund info for event payload
      ;(result as any).cancellationRefund = {
        refundAmount: refund.refundAmount,
        penaltyAmount: refund.penaltyAmount,
      }
    } catch (err) {
      // If no policy found or policy check fails, allow cancellation with full refund (legacy behavior)
      this.logger.warn({ err }, 'Cancellation policy check failed, allowing with full refund')
    }

    await this.bookingRepo.updateStatus(bookingId, 'CANCELLED', {
      cancelledAt: new Date(),
      cancelledById: userId,
      cancellationReason: dto.cancellationReason,
      cancellationNote: dto.cancellationNote,
    })
    await this.bookingRepo.updateRoomStatuses(bookingId, 'CANCELLED')
    await this.bookingRepo.addAuditEntry(
      bookingId,
      'CANCELLED',
      `Booking cancelled. Reason: ${dto.cancellationReason}`,
      userId,
      { reason: dto.cancellationReason, note: dto.cancellationNote },
    )

    // Release inventory for active rooms
    for (const room of result.rooms) {
      if (room.isActive) {
        try {
          const dateRange = DateRange.create(room.checkInDate, room.checkOutDate)
          await this.inventoryRepo.releaseInventory(
            room.roomTypeId,
            dateRange.checkIn,
            dateRange.checkOut,
          )
        } catch (err) {
          this.logger.error({ err, roomId: room.roomId }, 'Failed to release inventory on cancel')
        }
      }
    }

    await this.cache.invalidate(bookingId)

    const refundInfo = (result as any).cancellationRefund ?? {
      refundAmount: result.booking.amounts.finalAmount,
      penaltyAmount: 0,
    }
    this.eventPublisher
      .publish('booking.events', {
        eventType: 'booking.cancelled',
        aggregateId: bookingId,
        aggregateType: 'Booking',
        organizationId,
        correlationId,
        payload: {
          bookingId,
          hotelId: result.booking.hotelId,
          cancellationReason: dto.cancellationReason,
          cancelledById: userId,
          refundAmount: refundInfo.refundAmount,
          penaltyAmount: refundInfo.penaltyAmount,
        },
      })
      .catch((err) => this.logger.warn({ err }, 'Failed to publish booking.cancelled'))

    this.logger.info({ bookingId, correlationId }, 'Booking cancelled')
    const updated = await this.bookingRepo.findByIdWithDetails(bookingId)
    return updated ?? result
  }
}
