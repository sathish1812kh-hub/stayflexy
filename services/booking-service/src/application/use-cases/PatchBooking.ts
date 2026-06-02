import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IBookingRepository } from '../../domain/repositories/IBookingRepository'
import type { BookingCache } from '../../infrastructure/cache/BookingCache'
import type { Booking } from '../../domain/entities/Booking'
import type { PatchBookingDto } from '../dtos/booking.dto'
import type { Logger } from '@stayflexi/shared-logger'
import { getPrismaClient } from '@stayflexi/shared-database'

export class PatchBooking {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly cache: BookingCache,
    private readonly logger: Logger
  ) {}

  async execute(bookingId: string, dto: PatchBookingDto, userId: string, organizationId: string, correlationId?: string): Promise<Booking> {
    const result = await this.bookingRepo.findByIdWithDetails(bookingId)
    if (!result) throw new NotFoundError('Booking not found')
    if (!result.booking.belongsToOrganization(organizationId)) throw new ForbiddenError('Access denied')
    if (!result.booking.canBeModified()) {
      throw new BadRequestError(`Cannot modify booking with status "${result.booking.status}"`)
    }

    const db = getPrismaClient()
    await db.booking.update({
      where: { id: bookingId },
      data: {
        ...(dto.specialRequests !== undefined && { specialRequests: dto.specialRequests }),
        ...(dto.internalNotes !== undefined && { internalNotes: dto.internalNotes }),
      },
    })

    await this.bookingRepo.addAuditEntry(bookingId, 'MODIFIED', 'Booking details updated', userId, { updatedFields: Object.keys(dto) })
    await this.cache.invalidate(bookingId)
    this.logger.info({ bookingId, correlationId }, 'Booking patched')
    return result.booking
  }
}
