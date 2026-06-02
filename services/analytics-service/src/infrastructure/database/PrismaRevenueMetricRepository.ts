import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient } from '@prisma/client'
import { RevenueMetric } from '../../domain/entities/RevenueMetric'
import type { RevenueMetricProps } from '../../domain/entities/RevenueMetric'
import type { IRevenueMetricRepository, UpsertRevenueMetricData } from '../../domain/repositories/IRevenueMetricRepository'

// Map Prisma record to domain entity
function mapToEntity(r: {
  id: string; organizationId: string; hotelId: string; metricDate: Date;
  occupancyRate: { toNumber(): number }; adr: { toNumber(): number };
  revpar: { toNumber(): number }; totalRevenue: { toNumber(): number };
  bookingCount: number; cancellationRate: { toNumber(): number };
  createdAt: Date; updatedAt: Date;
}): RevenueMetric {
  const props: RevenueMetricProps = {
    id: r.id, organizationId: r.organizationId, hotelId: r.hotelId,
    metricDate: r.metricDate,
    occupancyRate: r.occupancyRate.toNumber(), adr: r.adr.toNumber(),
    revpar: r.revpar.toNumber(), totalRevenue: r.totalRevenue.toNumber(),
    bookingCount: r.bookingCount, cancellationRate: r.cancellationRate.toNumber(),
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }
  return new RevenueMetric(props)
}

export class PrismaRevenueMetricRepository implements IRevenueMetricRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findByHotelAndRange(hotelId: string, from: Date, to: Date): Promise<RevenueMetric[]> {
    try {
      const records = await this.db.revenueMetric.findMany({
        where: { hotelId, metricDate: { gte: from, lte: to } },
        orderBy: { metricDate: 'asc' },
      })
      return records.map(mapToEntity)
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async findByHotelAndDate(hotelId: string, date: Date): Promise<RevenueMetric | null> {
    try {
      const r = await this.db.revenueMetric.findUnique({ where: { hotelId_metricDate: { hotelId, metricDate: date } } })
      return r ? mapToEntity(r) : null
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async upsert(data: UpsertRevenueMetricData): Promise<RevenueMetric> {
    try {
      const r = await this.db.revenueMetric.upsert({
        where: { hotelId_metricDate: { hotelId: data.hotelId, metricDate: data.metricDate } },
        create: {
          organizationId: data.organizationId, hotelId: data.hotelId,
          metricDate: data.metricDate,
          occupancyRate: new Prisma.Decimal(data.occupancyRate),
          adr: new Prisma.Decimal(data.adr), revpar: new Prisma.Decimal(data.revpar),
          totalRevenue: new Prisma.Decimal(data.totalRevenue),
          bookingCount: data.bookingCount,
          cancellationRate: new Prisma.Decimal(data.cancellationRate),
        },
        update: {
          occupancyRate: new Prisma.Decimal(data.occupancyRate),
          adr: new Prisma.Decimal(data.adr), revpar: new Prisma.Decimal(data.revpar),
          totalRevenue: new Prisma.Decimal(data.totalRevenue),
          bookingCount: data.bookingCount,
          cancellationRate: new Prisma.Decimal(data.cancellationRate),
        },
      })
      return mapToEntity(r)
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async findByOrganization(organizationId: string, from: Date, to: Date): Promise<RevenueMetric[]> {
    try {
      const records = await this.db.revenueMetric.findMany({
        where: { organizationId, metricDate: { gte: from, lte: to } },
        orderBy: [{ hotelId: 'asc' }, { metricDate: 'asc' }],
      })
      return records.map(mapToEntity)
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }
}
