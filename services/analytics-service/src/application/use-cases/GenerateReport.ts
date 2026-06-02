import { DateRange } from '../../domain/value-objects/DateRange'
import type { AnalyticsReport } from '../../domain/entities/AnalyticsReport'
import type { IAnalyticsReportRepository } from '../../domain/repositories/IAnalyticsReportRepository'
import type { ReportAggregator } from '../../aggregators/ReportAggregator'
import type { ExportGenerator } from '../../exports/ExportGenerator'
import type { GenerateReportDto } from '../dtos/analytics.dto'
import type { Logger } from '@stayflexi/shared-logger'

export class GenerateReport {
  constructor(
    private readonly reportRepo: IAnalyticsReportRepository,
    private readonly reportAggregator: ReportAggregator,
    private readonly exportGenerator: ExportGenerator,
    private readonly logger: Logger,
  ) {}

  async execute(dto: GenerateReportDto, organizationId: string, userId: string): Promise<AnalyticsReport> {
    const range = new DateRange(dto.dateFrom, dto.dateTo)

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // Reports expire after 24 hours

    const report = await this.reportRepo.create({
      organizationId,
      hotelId: dto.hotelId,
      reportType: dto.reportType.toUpperCase() as AnalyticsReport['reportType'],
      dateFrom: range.from,
      dateTo: range.to,
      format: dto.format,
      requestedById: userId,
      expiresAt,
    })

    this.logger.info({ reportId: report.id, reportType: dto.reportType, hotelId: dto.hotelId }, 'Report generation initiated')

    // Async report generation — does not block response
    setImmediate(() => {
      void this.processReport(report.id, dto, organizationId, range)
    })

    return report
  }

  private async processReport(reportId: string, dto: GenerateReportDto, organizationId: string, range: DateRange): Promise<void> {
    try {
      await this.reportRepo.update(reportId, { reportStatus: 'PROCESSING' })

      let reportData: unknown
      switch (dto.reportType) {
        case 'financial':
          reportData = await this.reportAggregator.generateFinancialReport(dto.hotelId, organizationId, range.from, range.to)
          break
        case 'occupancy':
          reportData = await this.reportAggregator.generateOccupancyReport(dto.hotelId, range.from, range.to)
          break
        case 'ota':
          reportData = await this.reportAggregator.generateOtaReport(dto.hotelId, range.from, range.to)
          break
        default:
          reportData = { reportType: dto.reportType, message: 'Report generated', hotelId: dto.hotelId, period: { from: range.fromISO, to: range.toISO } }
      }

      await this.reportRepo.update(reportId, {
        reportStatus: 'COMPLETED',
        reportData: dto.format === 'csv' ? this.toCsv(reportData) : reportData,
        completedAt: new Date(),
      })

      this.logger.info({ reportId, reportType: dto.reportType }, 'Report generation completed')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Report generation failed'
      this.logger.error({ reportId, err }, 'Report generation failed')
      await this.reportRepo.update(reportId, {
        reportStatus: 'FAILED',
        errorMessage: message,
      }).catch(() => undefined)
    }
  }

  private toCsv(data: unknown): string {
    if (typeof data !== 'object' || data === null) return String(data)
    const rows: string[][] = []
    const flatten = (o: unknown, prefix = ''): void => {
      if (typeof o !== 'object' || o === null) return
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        const key = prefix ? `${prefix}.${k}` : k
        if (Array.isArray(v)) {
          rows.push([key, v.map(i => typeof i === 'object' ? JSON.stringify(i) : String(i)).join(';')])
        } else if (typeof v === 'object' && v !== null) {
          flatten(v, key)
        } else {
          rows.push([key, String(v ?? '')])
        }
      }
    }
    flatten(data)
    return rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  }
}
