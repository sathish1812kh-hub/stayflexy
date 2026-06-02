import type { IBookingRepository, FullBooking } from '../../domain/repositories/IBookingRepository'
import type { PaginatedResult } from '@stayflexi/shared-types'
import type { SearchBookingDto } from '../dtos/booking.dto'

export class SearchBookings {
  constructor(private readonly bookingRepo: IBookingRepository) {}

  async execute(dto: SearchBookingDto, organizationId: string): Promise<PaginatedResult<FullBooking>> {
    return this.bookingRepo.findByOrganization({
      organizationId,
      hotelId: dto.hotelId,
      status: dto.status,
      source: dto.source,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      guestEmail: dto.guestEmail,
      guestName: dto.guestName,
      bookingNumber: dto.bookingNumber,
      page: dto.page,
      limit: dto.limit,
    })
  }
}
