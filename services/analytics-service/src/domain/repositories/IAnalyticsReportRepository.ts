import type { AnalyticsReport, ReportStatus, ReportType } from '../entities/AnalyticsReport'

export interface CreateReportData {
  organizationId: string
  hotelId: string
  reportType: ReportType
  dateFrom: Date
  dateTo: Date
  format: string
  requestedById: string
  expiresAt: Date
}

export interface UpdateReportData {
  reportStatus: ReportStatus
  reportData?: unknown
  errorMessage?: string
  completedAt?: Date
}

export interface IAnalyticsReportRepository {
  create(data: CreateReportData): Promise<AnalyticsReport>
  findById(id: string): Promise<AnalyticsReport | null>
  update(id: string, data: UpdateReportData): Promise<AnalyticsReport>
  findByOrganization(organizationId: string, page: number, limit: number): Promise<AnalyticsReport[]>
}
