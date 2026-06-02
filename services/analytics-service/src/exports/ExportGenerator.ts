import { randomUUID } from 'crypto'
import type { AnalyticsCache } from '../infrastructure/cache/AnalyticsCache'
import type { ReportAggregator } from '../aggregators/ReportAggregator'
import type { ExportQuery } from '../application/dtos/analytics.dto'
import type { Logger } from '@stayflexi/shared-logger'
import { DateRange } from '../domain/value-objects/DateRange'

export interface ExportJob {
  exportId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  reportType: string
  format: string
  hotelId: string
  createdAt: string
  completedAt?: string
  downloadUrl?: string
  data?: unknown
  error?: string
}

export class ExportGenerator {
  constructor(
    private readonly reportAggregator: ReportAggregator,
    private readonly cache: AnalyticsCache,
    private readonly logger: Logger,
  ) {}

  async initiateExport(query: ExportQuery, organizationId: string): Promise<ExportJob> {
    const exportId = randomUUID()
    const job: ExportJob = {
      exportId,
      status: 'PENDING',
      reportType: query.reportType,
      format: query.format,
      hotelId: query.hotelId,
      createdAt: new Date().toISOString(),
    }

    await this.cache.setExportStatus(exportId, job)

    // Process asynchronously
    setImmediate(() => {
      void this.processExport(exportId, query, organizationId)
    })

    return job
  }

  async getExportStatus(exportId: string): Promise<ExportJob | null> {
    return this.cache.getExportStatus(exportId) as Promise<ExportJob | null>
  }

  private async processExport(exportId: string, query: ExportQuery, organizationId: string): Promise<void> {
    const range = new DateRange(query.dateFrom, query.dateTo)

    try {
      await this.cache.setExportStatus(exportId, {
        exportId, status: 'PROCESSING', reportType: query.reportType,
        format: query.format, hotelId: query.hotelId,
        createdAt: new Date().toISOString(),
      })

      let data: unknown
      switch (query.reportType) {
        case 'financial':
          data = await this.reportAggregator.generateFinancialReport(query.hotelId, organizationId, range.from, range.to)
          break
        case 'occupancy':
          data = await this.reportAggregator.generateOccupancyReport(query.hotelId, range.from, range.to)
          break
        case 'ota':
          data = await this.reportAggregator.generateOtaReport(query.hotelId, range.from, range.to)
          break
        default:
          data = { reportType: query.reportType, message: 'Report generated' }
      }

      const serialized = query.format === 'csv'
        ? this.toCsv(data)
        : JSON.stringify(data, null, 2)

      const completedJob: ExportJob = {
        exportId,
        status: 'COMPLETED',
        reportType: query.reportType,
        format: query.format,
        hotelId: query.hotelId,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        data: serialized,
      }
      await this.cache.setExportStatus(exportId, completedJob, 3600)
      this.logger.info({ exportId, reportType: query.reportType }, 'Export completed')
    } catch (err) {
      this.logger.error({ exportId, err }, 'Export failed')
      const failedJob: ExportJob = {
        exportId, status: 'FAILED', reportType: query.reportType,
        format: query.format, hotelId: query.hotelId,
        createdAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Export failed',
      }
      await this.cache.setExportStatus(exportId, failedJob, 1800)
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
          if (v.length > 0 && typeof v[0] === 'object') {
            for (const item of v) flatten(item, key)
          } else {
            rows.push([key, v.join(';')])
          }
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
