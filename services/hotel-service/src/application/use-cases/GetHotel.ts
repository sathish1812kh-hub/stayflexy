import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { HotelCache } from '../services/HotelCache'
import type { Hotel } from '../../domain/entities/Hotel'

export class GetHotel {
  constructor(
    private readonly hotelRepo: IHotelRepository,
    private readonly cache: HotelCache
  ) {}

  async execute(id: string, requestingOrgId: string | null): Promise<Hotel> {
    const cached = await this.cache.get(id)
    if (cached) {
      if (requestingOrgId && !cached.belongsTo(requestingOrgId)) {
        throw new ForbiddenError('Access denied to this hotel', 'HOTEL_ACCESS_DENIED')
      }
      return cached
    }

    const hotel = await this.hotelRepo.findById(id)
    if (!hotel || hotel.isDeleted) {
      throw new NotFoundError('Hotel not found')
    }

    if (requestingOrgId && !hotel.belongsTo(requestingOrgId)) {
      throw new ForbiddenError('Access denied to this hotel', 'HOTEL_ACCESS_DENIED')
    }

    await this.cache.set(hotel)
    return hotel
  }
}
