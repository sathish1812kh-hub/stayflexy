// FILE: src/modules/revenue/repositories/PrismaCompetitorHotelRepository.ts
import { type Prisma } from '@prisma/client'
import { BaseRepository } from '@lib/baseRepository'
import type { Nullable, PaginationParams, PaginatedResult } from '@shared-types'
import type { CompetitorHotel } from '../types'

type PrismaCompetitorHotelRecord = Prisma.CompetitorHotelGetPayload<Record<string, never>>

function toCompetitorHotel(r: PrismaCompetitorHotelRecord): CompetitorHotel {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    name: r.name,
    location: r.location,
    starRating: r.starRating ? r.starRating.toNumber() : null,
    pricingSegment: r.pricingSegment,
    importance: r.importance,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

export class PrismaCompetitorHotelRepository extends BaseRepository<
  CompetitorHotel,
  Omit<CompetitorHotel, 'id' | 'createdAt' | 'updatedAt'>,
  Partial<Omit<CompetitorHotel, 'id' | 'createdAt' | 'updatedAt'>>
> {
  async findMany(params: PaginationParams): Promise<PaginatedResult<CompetitorHotel>> {
    const skip = this.buildSkip(params)
    const [records, total] = await Promise.all([
      this.db.competitorHotel.findMany({
        skip,
        take: params.limit,
        orderBy: { name: 'asc' }
      }),
      this.db.competitorHotel.count()
    ])
    return {
      data: records.map(toCompetitorHotel),
      meta: this.buildPaginationMeta(total, params)
    }
  }

  async findById(id: string): Promise<Nullable<CompetitorHotel>> {
    const r = await this.db.competitorHotel.findFirst({ where: { id } })
    return r ? toCompetitorHotel(r) : null
  }

  async findManyByHotel(hotelId: string, orgId: string): Promise<CompetitorHotel[]> {
    const records = await this.db.competitorHotel.findMany({
      where: { hotelId, organizationId: orgId },
      orderBy: { name: 'asc' }
    })
    return records.map(toCompetitorHotel)
  }

  async create(data: Omit<CompetitorHotel, 'id' | 'createdAt' | 'updatedAt'>): Promise<CompetitorHotel> {
    const r = await this.db.competitorHotel.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        name: data.name,
        location: data.location,
        starRating: data.starRating,
        pricingSegment: data.pricingSegment,
        importance: data.importance,
        isActive: data.isActive
      }
    })
    return toCompetitorHotel(r)
  }

  async update(id: string, data: Partial<Omit<CompetitorHotel, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CompetitorHotel> {
    const r = await this.db.competitorHotel.update({
      where: { id },
      data: {
        name: data.name,
        location: data.location,
        starRating: data.starRating,
        pricingSegment: data.pricingSegment,
        importance: data.importance,
        isActive: data.isActive
      }
    })
    return toCompetitorHotel(r)
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.competitorHotel.delete({ where: { id } })
  }
}
