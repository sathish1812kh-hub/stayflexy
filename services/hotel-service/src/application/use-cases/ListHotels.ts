import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { Hotel, HotelStatus } from '../../domain/entities/Hotel'
import type { ListHotelsDto } from '../dtos/hotel.dto'
import type { PaginatedResult } from '@stayflexi/shared-types'

export class ListHotels {
  constructor(private readonly hotelRepo: IHotelRepository) {}

  async execute(
    dto: ListHotelsDto,
    requestingOrgId: string | null,
    requestingRole: string
  ): Promise<PaginatedResult<Hotel>> {
    const isSuperAdmin = requestingRole === 'SUPER_ADMIN'

    return this.hotelRepo.findMany({
      // SUPER_ADMIN can filter by any org or see all; regular users locked to their org
      organizationId: isSuperAdmin ? dto.organizationId : (requestingOrgId ?? undefined),
      status: dto.status as HotelStatus | undefined,
      page: dto.page,
      limit: dto.limit,
    })
  }
}
