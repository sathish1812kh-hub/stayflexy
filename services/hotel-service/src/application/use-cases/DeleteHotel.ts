import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import { HOTEL_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { HotelCache } from '../services/HotelCache'
import type { Logger } from '@stayflexi/shared-logger'

export class DeleteHotel {
  constructor(
    private readonly hotelRepo: IHotelRepository,
    private readonly cache: HotelCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(
    id: string,
    requestingUserId: string,
    requestingOrgId: string | null,
    correlationId?: string,
  ): Promise<void> {
    const hotel = await this.hotelRepo.findById(id)
    if (!hotel || hotel.isDeleted) {
      throw new NotFoundError('Hotel not found')
    }
    if (requestingOrgId && !hotel.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this hotel', 'HOTEL_ACCESS_DENIED')
    }
    await this.hotelRepo.softDelete(id)
    await this.cache.invalidate(id)
    this.eventPublisher
      .publish('hotel.events', {
        eventType: HOTEL_EVENTS.HOTEL_UPDATED,
        aggregateId: id,
        aggregateType: 'Hotel',
        organizationId: hotel.organizationId,
        correlationId,
        payload: { hotelId: id, deleted: true, deletedBy: requestingUserId },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish hotel.deleted event')
      })
    this.logger.info({ hotelId: id, requestingUserId, correlationId }, 'Hotel soft-deleted')
  }
}
