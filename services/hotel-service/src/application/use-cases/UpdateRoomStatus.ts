import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import { HOTEL_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { IRoomRepository } from '../../domain/repositories/IRoomRepository'
import type { RoomCache } from '../services/RoomCache'
import type { UpdateRoomStatusDto } from '../dtos/hotel.dto'
import type { Room } from '../../domain/entities/Room'
import type { Logger } from '@stayflexi/shared-logger'

export class UpdateRoomStatus {
  constructor(
    private readonly hotelRepo: IHotelRepository,
    private readonly roomRepo: IRoomRepository,
    private readonly cache: RoomCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    roomId: string,
    dto: UpdateRoomStatusDto,
    requestingUserId: string,
    requestingOrgId: string,
    correlationId?: string
  ): Promise<Room> {
    const room = await this.roomRepo.findById(roomId)
    if (!room) {
      throw new NotFoundError('Room not found')
    }

    if (!room.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this room', 'ROOM_ACCESS_DENIED')
    }

    if (!room.isActive) {
      throw new ForbiddenError('Cannot update status of an inactive room', 'ROOM_INACTIVE')
    }

    const hotel = await this.hotelRepo.findById(room.hotelId)
    if (!hotel || hotel.isDeleted) {
      throw new NotFoundError('Hotel not found')
    }

    if (!hotel.isActive) {
      throw new ForbiddenError(
        'Cannot update room status for an inactive hotel',
        'HOTEL_INACTIVE'
      )
    }

    if (!room.canTransitionTo(dto.status)) {
      throw new BadRequestError(
        `Invalid status transition from '${room.status}' to '${dto.status}'`
      )
    }

    const fromStatus = room.status
    const updated = await this.roomRepo.updateStatus(roomId, dto.status)

    await this.roomRepo.createStatusAudit({
      roomId,
      fromStatus,
      toStatus: dto.status,
      changedBy: requestingUserId,
      reason: dto.reason,
    })

    await this.cache.invalidate(roomId)

    this.eventPublisher
      .publish('hotel.events', {
        eventType: HOTEL_EVENTS.ROOM_STATUS_UPDATED,
        aggregateId: roomId,
        aggregateType: 'Room',
        organizationId: requestingOrgId,
        correlationId,
        payload: {
          roomId,
          hotelId: room.hotelId,
          fromStatus,
          toStatus: dto.status,
          changedBy: requestingUserId,
          reason: dto.reason,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish room.status_updated event')
      })

    this.logger.info(
      { roomId, fromStatus, toStatus: dto.status, requestingUserId, correlationId },
      'Room status updated'
    )
    return updated
  }
}
