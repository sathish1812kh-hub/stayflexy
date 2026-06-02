import type { PrismaClient } from '@stayflexi/shared-database'
import { RateRecommendation } from '../../domain/entities/RateRecommendation'
import type { RateRecommendationProps } from '../../domain/entities/RateRecommendation'

type AnyClient = PrismaClient & Record<string, any>

function toDomain(raw: any): RateRecommendation {
  return new RateRecommendation({
    id: raw.id,
    organizationId: raw.organizationId,
    hotelId: raw.hotelId,
    roomTypeId: raw.roomTypeId,
    targetDate: raw.targetDate,
    basePrice: Number(raw.basePrice),
    recommendedPrice: Number(raw.recommendedPrice),
    minPrice: Number(raw.minPrice),
    maxPrice: Number(raw.maxPrice),
    confidenceScore: Number(raw.confidenceScore),
    occupancyFactor: Number(raw.occupancyFactor),
    seasonalFactor: Number(raw.seasonalFactor),
    demandFactor: Number(raw.demandFactor),
    rationale: raw.rationale,
    appliedAt: raw.appliedAt,
    expiresAt: raw.expiresAt,
    createdAt: raw.createdAt,
  })
}

export class PrismaRateRecommendationRepository {
  private get repo() { return (this.db as AnyClient)['rateRecommendation'] }

  constructor(private readonly db: PrismaClient) {}

  async findByRoomTypeAndDate(roomTypeId: string, targetDate: string): Promise<RateRecommendation | null> {
    const raw = await this.repo.findUnique({ where: { hotelId_roomTypeId_targetDate: undefined as any } })
    // Using findFirst since we need compound key matching
    const row = await this.repo.findFirst({ where: { roomTypeId, targetDate } })
    return row ? toDomain(row) : null
  }

  async findByHotelAndDateRange(hotelId: string, from: string, to: string): Promise<RateRecommendation[]> {
    const rows = await this.repo.findMany({
      where: { hotelId, targetDate: { gte: from, lte: to }, expiresAt: { gt: new Date() } },
      orderBy: [{ targetDate: 'asc' }, { confidenceScore: 'desc' }],
    })
    return rows.map(toDomain)
  }

  async upsert(data: Omit<RateRecommendationProps, 'id' | 'createdAt'>): Promise<RateRecommendation> {
    const raw = await this.repo.upsert({
      where: { hotelId_roomTypeId_targetDate: { hotelId: data.hotelId, roomTypeId: data.roomTypeId, targetDate: data.targetDate } },
      create: data,
      update: {
        recommendedPrice: data.recommendedPrice,
        confidenceScore: data.confidenceScore,
        occupancyFactor: data.occupancyFactor,
        seasonalFactor: data.seasonalFactor,
        demandFactor: data.demandFactor,
        rationale: data.rationale,
        expiresAt: data.expiresAt,
        appliedAt: null,
      },
    })
    return toDomain(raw)
  }

  async markApplied(id: string): Promise<void> {
    await this.repo.update({ where: { id }, data: { appliedAt: new Date() } })
  }
}
