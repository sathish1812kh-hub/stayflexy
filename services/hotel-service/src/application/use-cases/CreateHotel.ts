import { ConflictError } from '@stayflexi/shared-errors'
import { HOTEL_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { Hotel } from '../../domain/entities/Hotel'
import type { CreateHotelDto } from '../dtos/hotel.dto'
import type { Logger } from '@stayflexi/shared-logger'

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export class CreateHotel {
  constructor(
    private readonly hotelRepo: IHotelRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    dto: CreateHotelDto,
    organizationId: string,
    requestingUserId: string,
    correlationId?: string
  ): Promise<Hotel> {
    const slug = dto.slug ?? slugify(dto.name)

    const existing = await this.hotelRepo.findBySlug(slug)
    if (existing) {
      throw new ConflictError(
        'A hotel with this slug already exists. Provide a unique slug.',
        'SLUG_TAKEN'
      )
    }

    const hotel = await this.hotelRepo.create({
      organizationId,
      name: dto.name,
      slug,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      country: dto.country,
      postalCode: dto.postalCode,
      phone: dto.phone,
      email: dto.email,
      website: dto.website,
      starRating: dto.starRating,
      timezone: dto.timezone,
      checkInTime: dto.checkInTime,
      checkOutTime: dto.checkOutTime,
      createdById: requestingUserId,
    })

    this.eventPublisher
      .publish('hotel.events', {
        eventType: HOTEL_EVENTS.HOTEL_CREATED,
        aggregateId: hotel.id,
        aggregateType: 'Hotel',
        organizationId,
        correlationId,
        payload: {
          hotelId: hotel.id,
          organizationId,
          name: hotel.name,
          slug: hotel.slug,
          createdById: requestingUserId,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish hotel.created event')
      })

    this.logger.info({ hotelId: hotel.id, organizationId, correlationId }, 'Hotel created')
    return hotel
  }
}
