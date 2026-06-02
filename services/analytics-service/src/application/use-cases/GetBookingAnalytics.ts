import { DateRange } from '../../domain/value-objects/DateRange'
import type { PrismaClient } from '@prisma/client'
import type { AnalyticsCache } from '../../infrastructure/cache/AnalyticsCache'
import type { AnalyticsQuery } from '../dtos/analytics.dto'
import type { Logger } from '@stayflexi/shared-logger'

export class GetBookingAnalytics {
  constructor(
    private readonly db: PrismaClient,
    private readonly cache: AnalyticsCache,
    private readonly logger: Logger,
  ) {}

  async execute(query: AnalyticsQuery, organizationId: string): Promise<unknown> {
    const range = new DateRange(query.dateFrom, query.dateTo)

    const [byStatus, bySource, totalAgg] = await Promise.all([
      this.db.booking.groupBy({
        by: ['status'],
        where: { hotelId: query.hotelId, organizationId, createdAt: { gte: range.from, lte: range.to }, deletedAt: null },
        _count: { id: true },
        _sum: { finalAmount: true },
      }),
      this.db.booking.groupBy({
        by: ['source'],
        where: { hotelId: query.hotelId, organizationId, createdAt: { gte: range.from, lte: range.to }, deletedAt: null, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
        _count: { id: true },
        _sum: { finalAmount: true },
      }),
      this.db.booking.aggregate({
        where: { hotelId: query.hotelId, organizationId, createdAt: { gte: range.from, lte: range.to }, deletedAt: null },
        _count: { id: true },
        _avg: { finalAmount: true },
      }),
    ])

    const result = {
      hotelId: query.hotelId,
      period: { from: range.fromISO, to: range.toISO },
      byStatus: byStatus.map(r => ({ status: r.status, count: r._count.id, revenue: r._sum.finalAmount?.toNumber() ?? 0 })),
      bySource: bySource.map(r => ({ source: r.source, count: r._count.id, revenue: r._sum.finalAmount?.toNumber() ?? 0 })),
      totals: { total: totalAgg._count.id, avgValue: totalAgg._avg.finalAmount?.toNumber() ?? 0 },
    }
    return result
  }
}
