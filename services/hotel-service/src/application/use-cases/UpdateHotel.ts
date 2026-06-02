import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import { HOTEL_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { HotelCache } from '../services/HotelCache'
import type { UpdateHotelDto } from '../dtos/hotel.dto'
import type { Hotel } from '../../domain/entities/Hotel'
import type { Logger } from '@stayflexi/shared-logger'

export class UpdateHotel {
  constructor(
    private readonly hotelRepo: IHotelRepository,
    private readonly cache: HotelCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    id: string,
    dto: UpdateHotelDto,
    requestingUserId: string,
    requestingOrgId: string | null,
    correlationId?: string
  ): Promise<Hotel> {
    const hotel = await this.hotelRepo.findById(id)
    if (!hotel || hotel.isDeleted) {
      throw new NotFoundError('Hotel not found')
    }

    if (requestingOrgId && !hotel.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this hotel', 'HOTEL_ACCESS_DENIED')
    }

    const updated = await this.hotelRepo.update(id, dto)
    await this.cache.invalidate(id)

    this.eventPublisher
      .publish('hotel.events', {
        eventType: HOTEL_EVENTS.HOTEL_UPDATED,
        aggregateId: id,
        aggregateType: 'Hotel',
        organizationId: hotel.organizationId,
        correlationId,
        payload: {
          hotelId: id,
          updatedFields: Object.keys(dto),
          updatedBy: requestingUserId,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish hotel.updated event')
      })

    this.logger.info({ hotelId: id, requestingUserId, correlationId }, 'Hotel updated')
    return updated
  }
}
