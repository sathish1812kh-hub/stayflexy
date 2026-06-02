import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { IRoomRepository } from '../../domain/repositories/IRoomRepository'
import type { Room, RoomStatus } from '../../domain/entities/Room'
import type { ListRoomsDto } from '../dtos/hotel.dto'
import type { PaginatedResult } from '@stayflexi/shared-types'

export class ListRooms {
  constructor(
    private readonly hotelRepo: IHotelRepository,
    private readonly roomRepo: IRoomRepository
  ) {}

  async execute(
    hotelId: string,
    dto: ListRoomsDto,
    requestingOrgId: string
  ): Promise<PaginatedResult<Room>> {
    const hotel = await this.hotelRepo.findById(hotelId)
    if (!hotel || hotel.isDeleted) {
      throw new NotFoundError('Hotel not found')
    }

    if (!hotel.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this hotel', 'HOTEL_ACCESS_DENIED')
    }

    return this.roomRepo.findMany({
      hotelId,
      status: dto.status as RoomStatus | undefined,
      roomTypeId: dto.roomTypeId,
      isActive: dto.isActive,
      page: dto.page,
      limit: dto.limit,
    })
  }
}
