import type { PrismaClient } from '@stayflexi/shared-database'
import { RevenueTarget } from '../../domain/entities/RevenueTarget'
import type { RevenueTargetProps } from '../../domain/entities/RevenueTarget'

type AnyClient = PrismaClient & Record<string, any>

function toDomain(raw: any): RevenueTarget {
  return new RevenueTarget({
    id: raw.id,
    organizationId: raw.organizationId,
    hotelId: raw.hotelId,
    targetPeriod: raw.targetPeriod,
    targetRevenue: Number(raw.targetRevenue),
    targetRevPar: Number(raw.targetRevPar),
    targetAdr: Number(raw.targetAdr),
    targetOccupancy: Number(raw.targetOccupancy),
    actualRevenue: raw.actualRevenue !== null ? Number(raw.actualRevenue) : null,
    actualRevPar: raw.actualRevPar !== null ? Number(raw.actualRevPar) : null,
    actualAdr: raw.actualAdr !== null ? Number(raw.actualAdr) : null,
    actualOccupancy: raw.actualOccupancy !== null ? Number(raw.actualOccupancy) : null,
    createdById: raw.createdById,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  })
}

export class PrismaRevenueTargetRepository {
  private get repo() { return (this.db as AnyClient)['revenueTarget'] }

  constructor(private readonly db: PrismaClient) {}

  async findByHotelAndPeriod(hotelId: string, targetPeriod: string): Promise<RevenueTarget | null> {
    const raw = await this.repo.findUnique({ where: { hotelId_targetPeriod: { hotelId, targetPeriod } } })
    return raw ? toDomain(raw) : null
  }

  async findByHotel(hotelId: string, organizationId: string): Promise<RevenueTarget[]> {
    const rows = await this.repo.findMany({
      where: { hotelId, organizationId },
      orderBy: { targetPeriod: 'desc' },
      take: 24, // last 2 years
    })
    return rows.map(toDomain)
  }

  async create(data: Omit<RevenueTargetProps, 'id' | 'createdAt' | 'updatedAt' | 'actualRevenue' | 'actualRevPar' | 'actualAdr' | 'actualOccupancy'>): Promise<RevenueTarget> {
    const raw = await this.repo.create({ data: { ...data, actualRevenue: null, actualRevPar: null, actualAdr: null, actualOccupancy: null } })
    return toDomain(raw)
  }

  async updateActuals(hotelId: string, targetPeriod: string, actuals: {
    actualRevenue?: number
    actualRevPar?: number
    actualAdr?: number
    actualOccupancy?: number
  }): Promise<RevenueTarget | null> {
    const raw = await this.repo.update({
      where: { hotelId_targetPeriod: { hotelId, targetPeriod } },
      data: actuals,
    }).catch(() => null)
    return raw ? toDomain(raw) : null
  }
}
