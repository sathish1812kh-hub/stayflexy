import { NotFoundError, ForbiddenError, ConflictError } from '@stayflexi/shared-errors'
import { HOTEL_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IRoomTypeRepository } from '../../domain/repositories/IRoomTypeRepository'
import type { RoomTypeCache } from '../services/RoomTypeCache'
import type { UpdateRoomTypeDto } from '../dtos/hotel.dto'
import type { RoomType } from '../../domain/entities/RoomType'
import type { Logger } from '@stayflexi/shared-logger'

export class UpdateRoomType {
  constructor(
    private readonly roomTypeRepo: IRoomTypeRepository,
    private readonly cache: RoomTypeCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    id: string,
    dto: UpdateRoomTypeDto,
    requestingOrgId: string,
    correlationId?: string
  ): Promise<RoomType> {
    const roomType = await this.roomTypeRepo.findById(id)
    if (!roomType) {
      throw new NotFoundError('Room type not found')
    }

    if (!roomType.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this room type', 'ROOM_TYPE_ACCESS_DENIED')
    }

    if (dto.name && dto.name !== roomType.name) {
      const conflict = await this.roomTypeRepo.findByHotelAndName(roomType.hotelId, dto.name)
      if (conflict) {
        throw new ConflictError(
          `Room type '${dto.name}' already exists in this hotel`,
          'ROOM_TYPE_NAME_TAKEN'
        )
      }
    }

    const updated = await this.roomTypeRepo.update(id, dto)
    await this.cache.invalidate(id)

    this.eventPublisher
      .publish('hotel.events', {
        eventType: HOTEL_EVENTS.ROOM_TYPE_UPDATED,
        aggregateId: id,
        aggregateType: 'RoomType',
        organizationId: requestingOrgId,
        correlationId,
        payload: { roomTypeId: id, updatedFields: Object.keys(dto) },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish room_type.updated event')
      })

    this.logger.info({ roomTypeId: id, correlationId }, 'Room type updated')
    return updated
  }
}
