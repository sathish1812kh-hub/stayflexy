import type { PrismaClient } from '@stayflexi/shared-database'
import { ForecastDataPoint } from '../../domain/entities/ForecastDataPoint'
import type { ForecastDataPointProps } from '../../domain/entities/ForecastDataPoint'

type AnyClient = PrismaClient & Record<string, any>

function toDomain(raw: any): ForecastDataPoint {
  return new ForecastDataPoint({
    id: raw.id,
    organizationId: raw.organizationId,
    hotelId: raw.hotelId,
    forecastDate: raw.forecastDate,
    projectedOccupancy: Number(raw.projectedOccupancy),
    projectedAdr: Number(raw.projectedAdr),
    projectedRevPar: Number(raw.projectedRevPar),
    confidence: raw.confidence,
    bookingVelocity: raw.bookingVelocity !== null ? Number(raw.bookingVelocity) : null,
    competitorRateIndex: raw.competitorRateIndex !== null ? Number(raw.competitorRateIndex) : null,
    eventImpact: raw.eventImpact,
    forecastedBy: raw.forecastedBy,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  })
}

export class PrismaForecastRepository {
  private get repo() { return (this.db as AnyClient)['forecastDataPoint'] }

  constructor(private readonly db: PrismaClient) {}

  async findByHotelAndDate(hotelId: string, forecastDate: string): Promise<ForecastDataPoint | null> {
    const raw = await this.repo.findUnique({ where: { hotelId_forecastDate: { hotelId, forecastDate } } })
    return raw ? toDomain(raw) : null
  }

  async findByHotelAndDateRange(hotelId: string, from: string, to: string): Promise<ForecastDataPoint[]> {
    const rows = await this.repo.findMany({
      where: { hotelId, forecastDate: { gte: from, lte: to } },
      orderBy: { forecastDate: 'asc' },
    })
    return rows.map(toDomain)
  }

  async upsertMany(data: Omit<ForecastDataPointProps, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<number> {
    let count = 0
    for (const d of data) {
      await this.repo.upsert({
        where: { hotelId_forecastDate: { hotelId: d.hotelId, forecastDate: d.forecastDate } },
        create: d,
        update: {
          projectedOccupancy: d.projectedOccupancy,
          projectedAdr: d.projectedAdr,
          projectedRevPar: d.projectedRevPar,
          confidence: d.confidence,
          bookingVelocity: d.bookingVelocity,
          forecastedBy: d.forecastedBy,
        },
      })
      count++
    }
    return count
  }
}
