import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import { HOTEL_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IRoomRepository } from '../../domain/repositories/IRoomRepository'
import type { IRoomTypeRepository } from '../../domain/repositories/IRoomTypeRepository'
import type { RoomCache } from '../services/RoomCache'
import type { UpdateRoomDto } from '../dtos/hotel.dto'
import type { Room } from '../../domain/entities/Room'
import type { Logger } from '@stayflexi/shared-logger'

export class UpdateRoom {
  constructor(
    private readonly roomRepo: IRoomRepository,
    private readonly roomTypeRepo: IRoomTypeRepository,
    private readonly cache: RoomCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    id: string,
    dto: UpdateRoomDto,
    requestingOrgId: string,
    correlationId?: string
  ): Promise<Room> {
    const room = await this.roomRepo.findById(id)
    if (!room) {
      throw new NotFoundError('Room not found')
    }

    if (!room.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this room', 'ROOM_ACCESS_DENIED')
    }

    if (dto.roomTypeId && dto.roomTypeId !== room.roomTypeId) {
      const roomType = await this.roomTypeRepo.findById(dto.roomTypeId)
      if (!roomType || !roomType.isActive) {
        throw new NotFoundError('Room type not found or inactive')
      }
      if (roomType.hotelId !== room.hotelId) {
        throw new ForbiddenError(
          'Room type does not belong to this hotel',
          'ROOM_TYPE_HOTEL_MISMATCH'
        )
      }
    }

    const updated = await this.roomRepo.update(id, dto)
    await this.cache.invalidate(id)

    this.eventPublisher
      .publish('hotel.events', {
        eventType: HOTEL_EVENTS.ROOM_UPDATED,
        aggregateId: id,
        aggregateType: 'Room',
        organizationId: requestingOrgId,
        correlationId,
        payload: { roomId: id, updatedFields: Object.keys(dto) },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish room.updated event')
      })

    this.logger.info({ roomId: id, correlationId }, 'Room updated')
    return updated
  }
}
