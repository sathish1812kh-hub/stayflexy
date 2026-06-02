import { NotFoundError, ForbiddenError, ConflictError } from '@stayflexi/shared-errors'
import { HOTEL_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { IRoomTypeRepository } from '../../domain/repositories/IRoomTypeRepository'
import type { IRoomRepository } from '../../domain/repositories/IRoomRepository'
import type { Room } from '../../domain/entities/Room'
import type { CreateRoomDto } from '../dtos/hotel.dto'
import type { Logger } from '@stayflexi/shared-logger'

export class CreateRoom {
  constructor(
    private readonly hotelRepo: IHotelRepository,
    private readonly roomTypeRepo: IRoomTypeRepository,
    private readonly roomRepo: IRoomRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    dto: CreateRoomDto,
    requestingOrgId: string,
    correlationId?: string
  ): Promise<Room> {
    const hotel = await this.hotelRepo.findById(dto.hotelId)
    if (!hotel || hotel.isDeleted) {
      throw new NotFoundError('Hotel not found')
    }

    if (!hotel.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this hotel', 'HOTEL_ACCESS_DENIED')
    }

    if (!hotel.isActive) {
      throw new ForbiddenError('Cannot add rooms to an inactive hotel', 'HOTEL_INACTIVE')
    }

    const roomType = await this.roomTypeRepo.findById(dto.roomTypeId)
    if (!roomType || !roomType.isActive) {
      throw new NotFoundError('Room type not found or inactive')
    }

    if (roomType.hotelId !== dto.hotelId) {
      throw new ForbiddenError(
        'Room type does not belong to this hotel',
        'ROOM_TYPE_HOTEL_MISMATCH'
      )
    }

    const existing = await this.roomRepo.findByHotelAndNumber(dto.hotelId, dto.roomNumber)
    if (existing) {
      throw new ConflictError(
        `Room number '${dto.roomNumber}' already exists in this hotel`,
        'ROOM_NUMBER_TAKEN'
      )
    }

    const room = await this.roomRepo.create({
      hotelId: dto.hotelId,
      organizationId: requestingOrgId,
      roomTypeId: dto.roomTypeId,
      roomNumber: dto.roomNumber,
      floor: dto.floor,
      notes: dto.notes,
      wing: dto.wing,
      zone: dto.zone,
      wifiSSID: dto.wifiSSID,
      wifiPassword: dto.wifiPassword,
      arrivalNotes: dto.arrivalNotes,
      lockVendor: dto.lockVendor,
      lockDeviceId: dto.lockDeviceId,
      lockSecret: dto.lockSecret,
      connectingRoomId: dto.connectingRoomId,
      parentRoomId: dto.parentRoomId,
    })

    this.eventPublisher
      .publish('hotel.events', {
        eventType: HOTEL_EVENTS.ROOM_CREATED,
        aggregateId: room.id,
        aggregateType: 'Room',
        organizationId: requestingOrgId,
        correlationId,
        payload: {
          roomId: room.id,
          hotelId: dto.hotelId,
          roomTypeId: dto.roomTypeId,
          roomNumber: room.roomNumber,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish room.created event')
      })

    this.logger.info({ roomId: room.id, hotelId: dto.hotelId, correlationId }, 'Room created')
    return room
  }
}
