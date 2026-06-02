import { DateRange } from '../../domain/value-objects/DateRange'
import type { IRevenueMetricRepository } from '../../domain/repositories/IRevenueMetricRepository'
import type { KpiCalculator } from '../../aggregators/KpiCalculator'
import type { AnalyticsCache } from '../../infrastructure/cache/AnalyticsCache'
import type { AnalyticsQuery } from '../dtos/analytics.dto'
import type { KpiMetrics } from '../../domain/value-objects/KpiMetrics'
import type { Logger } from '@stayflexi/shared-logger'

export class GetRevenueAnalytics {
  constructor(
    private readonly revenueMetricRepo: IRevenueMetricRepository,
    private readonly kpiCalculator: KpiCalculator,
    private readonly cache: AnalyticsCache,
    private readonly logger: Logger,
  ) {}

  async execute(query: AnalyticsQuery, organizationId: string): Promise<KpiMetrics & { dailyMetrics: unknown[] }> {
    const range = new DateRange(query.dateFrom, query.dateTo)

    // Check cache
    const cached = await this.cache.getKpis(query.hotelId, range.fromISO, range.toISO)
    if (cached) {
      this.logger.debug({ hotelId: query.hotelId }, 'KPI cache hit')
      return cached as KpiMetrics & { dailyMetrics: unknown[] }
    }

    // Try pre-aggregated metrics first
    const preAggregated = await this.revenueMetricRepo.findByHotelAndRange(query.hotelId, range.from, range.to)

    let result: KpiMetrics & { dailyMetrics: unknown[] }

    if (preAggregated.length > 0) {
      const totalRevenue = preAggregated.reduce((a, m) => a + m.totalRevenue, 0)
      const totalBookings = preAggregated.reduce((a, m) => a + m.bookingCount, 0)
      const avgOccupancy = preAggregated.reduce((a, m) => a + m.occupancyRate, 0) / preAggregated.length
      const avgAdr = preAggregated.reduce((a, m) => a + m.adr, 0) / preAggregated.length
      const avgRevpar = preAggregated.reduce((a, m) => a + m.revpar, 0) / preAggregated.length
      const avgCancellation = preAggregated.reduce((a, m) => a + m.cancellationRate, 0) / preAggregated.length

      result = {
        hotelId: query.hotelId,
        organizationId,
        period: { from: range.fromISO, to: range.toISO },
        occupancyRate: Math.round(avgOccupancy * 100) / 100,
        adr: Math.round(avgAdr * 100) / 100,
        revpar: Math.round(avgRevpar * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalBookings,
        cancellationRate: Math.round(avgCancellation * 100) / 100,
        averageStayDuration: 0,
        revenueByChannel: {},
        revenueByRoomType: {},
        dailyMetrics: preAggregated.map(m => ({
          date: m.metricDate.toISOString().split('T')[0] ?? '',
          occupancyRate: m.occupancyRate,
          adr: m.adr,
          revpar: m.revpar,
          totalRevenue: m.totalRevenue,
          bookingCount: m.bookingCount,
        })),
      }
    } else {
      // Compute from raw data
      const kpis = await this.kpiCalculator.calculateKpis(query.hotelId, organizationId, range.from, range.to)
      result = { ...kpis, dailyMetrics: [] }
    }

    await this.cache.setKpis(query.hotelId, range.fromISO, range.toISO, result)
    return result
  }
}
