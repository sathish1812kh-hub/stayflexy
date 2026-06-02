import { NotFoundError, ForbiddenError, ConflictError } from '@stayflexi/shared-errors'
import { HOTEL_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { IRoomTypeRepository } from '../../domain/repositories/IRoomTypeRepository'
import type { RoomType } from '../../domain/entities/RoomType'
import type { CreateRoomTypeDto } from '../dtos/hotel.dto'
import type { Logger } from '@stayflexi/shared-logger'

export class CreateRoomType {
  constructor(
    private readonly hotelRepo: IHotelRepository,
    private readonly roomTypeRepo: IRoomTypeRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    dto: CreateRoomTypeDto,
    requestingOrgId: string,
    correlationId?: string
  ): Promise<RoomType> {
    const hotel = await this.hotelRepo.findById(dto.hotelId)
    if (!hotel || hotel.isDeleted) {
      throw new NotFoundError('Hotel not found')
    }

    if (!hotel.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this hotel', 'HOTEL_ACCESS_DENIED')
    }

    if (!hotel.isActive) {
      throw new ForbiddenError('Cannot add room types to an inactive hotel', 'HOTEL_INACTIVE')
    }

    const existing = await this.roomTypeRepo.findByHotelAndName(dto.hotelId, dto.name)
    if (existing) {
      throw new ConflictError(
        `Room type '${dto.name}' already exists in this hotel`,
        'ROOM_TYPE_NAME_TAKEN'
      )
    }

    const roomType = await this.roomTypeRepo.create({
      hotelId: dto.hotelId,
      organizationId: requestingOrgId,
      name: dto.name,
      description: dto.description,
      basePrice: dto.basePrice,
      maxOccupancy: dto.maxOccupancy,
      maxAdults: dto.maxAdults,
      maxChildren: dto.maxChildren,
      maxInfants: dto.maxInfants,
      minChildAge: dto.minChildAge,
      maxChildAge: dto.maxChildAge,
      minInfantAge: dto.minInfantAge,
      maxInfantAge: dto.maxInfantAge,
      minOccupancy: dto.minOccupancy,
      absoluteMax: dto.absoluteMax,
      hourlyPrice: dto.hourlyPrice,
      extraBedPrice: dto.extraBedPrice,
      extraGuestPrice: dto.extraGuestPrice,
      maxExtraBeds: dto.maxExtraBeds,
      amenities: dto.amenities,
    })

    this.eventPublisher
      .publish('hotel.events', {
        eventType: HOTEL_EVENTS.ROOM_TYPE_CREATED,
        aggregateId: roomType.id,
        aggregateType: 'RoomType',
        organizationId: requestingOrgId,
        correlationId,
        payload: { roomTypeId: roomType.id, hotelId: dto.hotelId, name: roomType.name },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish room_type.created event')
      })

    this.logger.info(
      { roomTypeId: roomType.id, hotelId: dto.hotelId, correlationId },
      'Room type created'
    )
    return roomType
  }
}
