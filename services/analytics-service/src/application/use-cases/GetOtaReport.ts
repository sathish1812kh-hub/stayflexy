import { DateRange } from '../../domain/value-objects/DateRange'
import type { ReportAggregator } from '../../aggregators/ReportAggregator'
import type { AnalyticsQuery } from '../dtos/analytics.dto'
import type { Logger } from '@stayflexi/shared-logger'

export class GetOtaReport {
  constructor(
    private readonly reportAggregator: ReportAggregator,
    private readonly logger: Logger,
  ) {}

  async execute(query: AnalyticsQuery): Promise<unknown> {
    const range = new DateRange(query.dateFrom, query.dateTo)
    return this.reportAggregator.generateOtaReport(query.hotelId, range.from, range.to)
  }
}
