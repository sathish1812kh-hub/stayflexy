// FILE: src/modules/revenue/repositories/PrismaCompetitorPriceRepository.ts
import { type Prisma } from '@prisma/client'
import { BaseRepository } from '@lib/baseRepository'
import type { PaginationParams, PaginatedResult } from '@shared-types'
import type { CompetitorScrapedPrice } from '../types'

type PrismaCompetitorPriceRecord = Prisma.CompetitorScrapedPriceGetPayload<Record<string, never>>

function toCompetitorPrice(r: PrismaCompetitorPriceRecord): CompetitorScrapedPrice {
  return {
    id: r.id,
    organizationId: r.organizationId,
    competitorHotelId: r.competitorHotelId,
    roomType: r.roomType,
    listedPrice: r.listedPrice.toNumber(),
    taxesIncluded: r.taxesIncluded,
    availability: r.availability,
    checkInDate: r.checkInDate,
    checkOutDate: r.checkOutDate,
    sourcePlatform: r.sourcePlatform,
    scrapedAt: r.scrapedAt
  }
}

export class PrismaCompetitorPriceRepository extends BaseRepository<
  CompetitorScrapedPrice,
  Omit<CompetitorScrapedPrice, 'id' | 'scrapedAt'>,
  Partial<Omit<CompetitorScrapedPrice, 'id' | 'scrapedAt'>>
> {
  async findMany(params: PaginationParams): Promise<PaginatedResult<CompetitorScrapedPrice>> {
    const skip = this.buildSkip(params)
    const [records, total] = await Promise.all([
      this.db.competitorScrapedPrice.findMany({
        skip,
        take: params.limit,
        orderBy: { scrapedAt: 'desc' }
      }),
      this.db.competitorScrapedPrice.count()
    ])
    return {
      data: records.map(toCompetitorPrice),
      meta: this.buildPaginationMeta(total, params)
    }
  }

  async findById(id: string): Promise<CompetitorScrapedPrice | null> {
    const r = await this.db.competitorScrapedPrice.findFirst({ where: { id } })
    return r ? toCompetitorPrice(r) : null
  }

  async create(data: Omit<CompetitorScrapedPrice, 'id' | 'scrapedAt'>): Promise<CompetitorScrapedPrice> {
    const r = await this.db.competitorScrapedPrice.create({
      data: {
        organizationId: data.organizationId,
        competitorHotelId: data.competitorHotelId,
        roomType: data.roomType,
        listedPrice: data.listedPrice,
        taxesIncluded: data.taxesIncluded,
        availability: data.availability,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        sourcePlatform: data.sourcePlatform
      }
    })
    return toCompetitorPrice(r)
  }

  async update(id: string, data: Partial<Omit<CompetitorScrapedPrice, 'id' | 'scrapedAt'>>): Promise<CompetitorScrapedPrice> {
    const r = await this.db.competitorScrapedPrice.update({
      where: { id },
      data: {
        listedPrice: data.listedPrice,
        taxesIncluded: data.taxesIncluded,
        availability: data.availability,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        sourcePlatform: data.sourcePlatform
      }
    })
    return toCompetitorPrice(r)
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.competitorScrapedPrice.delete({ where: { id } })
  }

  async findPricesForComparison(
    competitorHotelIds: string[],
    checkInDate: Date,
    roomType: string
  ): Promise<CompetitorScrapedPrice[]> {
    const records = await this.db.competitorScrapedPrice.findMany({
      where: {
        competitorHotelId: { in: competitorHotelIds },
        checkInDate,
        roomType: {
          contains: roomType,
          mode: 'insensitive'
        },
        availability: true
      },
      orderBy: { scrapedAt: 'desc' }
    })
    return records.map(toCompetitorPrice)
  }

  async createMany(prices: Omit<CompetitorScrapedPrice, 'id' | 'scrapedAt'>[]): Promise<number> {
    const result = await this.db.competitorScrapedPrice.createMany({
      data: prices.map(p => ({
        organizationId: p.organizationId,
        competitorHotelId: p.competitorHotelId,
        roomType: p.roomType,
        listedPrice: p.listedPrice,
        taxesIncluded: p.taxesIncluded,
        availability: p.availability,
        checkInDate: p.checkInDate,
        checkOutDate: p.checkOutDate,
        sourcePlatform: p.sourcePlatform
      }))
    })
    return result.count
  }
}
