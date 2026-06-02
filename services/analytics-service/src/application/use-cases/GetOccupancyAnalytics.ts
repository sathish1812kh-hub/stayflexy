import { DateRange } from '../../domain/value-objects/DateRange'
import type { KpiCalculator } from '../../aggregators/KpiCalculator'
import type { AnalyticsCache } from '../../infrastructure/cache/AnalyticsCache'
import type { AnalyticsQuery } from '../dtos/analytics.dto'
import type { Logger } from '@stayflexi/shared-logger'

export class GetOccupancyAnalytics {
  constructor(
    private readonly kpiCalculator: KpiCalculator,
    private readonly cache: AnalyticsCache,
    private readonly logger: Logger,
  ) {}

  async execute(query: AnalyticsQuery): Promise<{ hotelId: string; period: { from: string; to: string }; daily: unknown[] }> {
    const range = new DateRange(query.dateFrom, query.dateTo)
    const cached = await this.cache.getOccupancy(query.hotelId, range.fromISO, range.toISO)
    if (cached) return cached as { hotelId: string; period: { from: string; to: string }; daily: unknown[] }

    const daily = await this.kpiCalculator.calculateOccupancy(query.hotelId, range.from, range.to)
    const result = { hotelId: query.hotelId, period: { from: range.fromISO, to: range.toISO }, daily }
    await this.cache.setOccupancy(query.hotelId, range.fromISO, range.toISO, result)
    return result
  }
}
