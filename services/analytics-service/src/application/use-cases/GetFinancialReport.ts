import { DateRange } from '../../domain/value-objects/DateRange'
import type { ReportAggregator } from '../../aggregators/ReportAggregator'
import type { AnalyticsCache } from '../../infrastructure/cache/AnalyticsCache'
import type { AnalyticsQuery } from '../dtos/analytics.dto'
import type { Logger } from '@stayflexi/shared-logger'

export class GetFinancialReport {
  constructor(
    private readonly reportAggregator: ReportAggregator,
    private readonly cache: AnalyticsCache,
    private readonly logger: Logger,
  ) {}

  async execute(query: AnalyticsQuery, organizationId: string): Promise<unknown> {
    const range = new DateRange(query.dateFrom, query.dateTo)
    const cached = await this.cache.getRevenueReport(query.hotelId, range.fromISO, range.toISO)
    if (cached) return cached

    const report = await this.reportAggregator.generateFinancialReport(query.hotelId, organizationId, range.from, range.to)
    await this.cache.setRevenueReport(query.hotelId, range.fromISO, range.toISO, report)
    return report
  }
}
