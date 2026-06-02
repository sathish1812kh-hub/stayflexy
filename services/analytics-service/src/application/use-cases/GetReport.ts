import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { AnalyticsReport } from '../../domain/entities/AnalyticsReport'
import type { IAnalyticsReportRepository } from '../../domain/repositories/IAnalyticsReportRepository'
import type { Logger } from '@stayflexi/shared-logger'

export class GetReport {
  constructor(
    private readonly reportRepo: IAnalyticsReportRepository,
    private readonly logger: Logger,
  ) {}

  async execute(reportId: string, organizationId: string): Promise<AnalyticsReport> {
    const report = await this.reportRepo.findById(reportId)
    if (!report) throw new NotFoundError(`Report ${reportId} not found`)
    if (!report.belongsToOrganization(organizationId)) throw new ForbiddenError('Access denied')

    // Check if report has expired
    if (report.isExpired && !report.isCompleted) {
      this.logger.warn({ reportId, organizationId }, 'Report access attempted on expired report')
    }

    this.logger.debug({ reportId, reportStatus: report.reportStatus }, 'Report retrieved')
    return report
  }
}
