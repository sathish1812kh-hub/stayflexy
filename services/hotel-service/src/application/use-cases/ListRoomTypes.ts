import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { IRoomTypeRepository } from '../../domain/repositories/IRoomTypeRepository'
import type { RoomType } from '../../domain/entities/RoomType'
import type { ListRoomTypesDto } from '../dtos/hotel.dto'
import type { PaginatedResult } from '@stayflexi/shared-types'

export class ListRoomTypes {
  constructor(
    private readonly hotelRepo: IHotelRepository,
    private readonly roomTypeRepo: IRoomTypeRepository
  ) {}

  async execute(
    hotelId: string,
    dto: ListRoomTypesDto,
    requestingOrgId: string
  ): Promise<PaginatedResult<RoomType>> {
    const hotel = await this.hotelRepo.findById(hotelId)
    if (!hotel || hotel.isDeleted) {
      throw new NotFoundError('Hotel not found')
    }

    if (!hotel.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this hotel', 'HOTEL_ACCESS_DENIED')
    }

    return this.roomTypeRepo.findMany({
      hotelId,
      isActive: dto.isActive,
      page: dto.page,
      limit: dto.limit,
    })
  }
}
