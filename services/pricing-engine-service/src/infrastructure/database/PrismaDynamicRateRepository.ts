import type { PrismaClient } from '@stayflexi/shared-database'
import { DynamicRate } from '../../domain/entities/DynamicRate'
import type { DynamicRateProps } from '../../domain/entities/DynamicRate'
import type { IDynamicRateRepository } from '../../domain/repositories/IDynamicRateRepository'

type AnyClient = PrismaClient & Record<string, any>

function toDomain(raw: any): DynamicRate {
  return new DynamicRate({
    id: raw.id,
    organizationId: raw.organizationId,
    hotelId: raw.hotelId,
    roomTypeId: raw.roomTypeId,
    inventoryDate: raw.inventoryDate,
    calculatedRate: Number(raw.calculatedRate),
    baseRate: Number(raw.baseRate),
    appliedRuleId: raw.appliedRuleId,
    occupancyFactor: Number(raw.occupancyFactor),
    demandFactor: Number(raw.demandFactor),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  })
}

export class PrismaDynamicRateRepository implements IDynamicRateRepository {
  private get repo() { return (this.db as AnyClient)['dynamicRate'] }

  constructor(private readonly db: PrismaClient) {}

  async findByRoomTypeAndDate(roomTypeId: string, inventoryDate: Date): Promise<DynamicRate | null> {
    const raw = await this.repo.findUnique({ where: { roomTypeId_inventoryDate: { roomTypeId, inventoryDate } } })
    return raw ? toDomain(raw) : null
  }

  async findByHotelAndDateRange(hotelId: string, from: Date, to: Date): Promise<DynamicRate[]> {
    const rows = await this.repo.findMany({
      where: { hotelId, inventoryDate: { gte: from, lte: to } },
      orderBy: [{ roomTypeId: 'asc' }, { inventoryDate: 'asc' }],
    })
    return rows.map(toDomain)
  }

  async upsert(data: Omit<DynamicRateProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<DynamicRate> {
    const raw = await this.repo.upsert({
      where: { roomTypeId_inventoryDate: { roomTypeId: data.roomTypeId, inventoryDate: data.inventoryDate } },
      create: data,
      update: {
        calculatedRate: data.calculatedRate,
        baseRate: data.baseRate,
        appliedRuleId: data.appliedRuleId,
        occupancyFactor: data.occupancyFactor,
        demandFactor: data.demandFactor,
      },
    })
    return toDomain(raw)
  }

  async batchUpsert(rates: Omit<DynamicRateProps, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number> {
    let count = 0
    for (const rate of rates) {
      await this.upsert(rate)
      count++
    }
    return count
  }

  async findDirtyRates(hotelId: string, since: Date): Promise<DynamicRate[]> {
    const rows = await this.repo.findMany({
      where: { hotelId, updatedAt: { gte: since } },
      orderBy: { updatedAt: 'asc' },
    })
    return rows.map(toDomain)
  }
}
