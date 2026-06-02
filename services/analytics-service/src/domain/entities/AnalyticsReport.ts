export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED'
export type ReportType = 'FINANCIAL' | 'OCCUPANCY' | 'OTA' | 'BOOKINGS' | 'OPERATIONS' | 'DASHBOARD' | 'CUSTOM'

export interface AnalyticsReportProps {
  id: string
  organizationId: string
  hotelId: string
  reportType: ReportType
  reportStatus: ReportStatus
  dateFrom: Date
  dateTo: Date
  format: string
  reportData: unknown | null
  errorMessage: string | null
  requestedById: string
  completedAt: Date | null
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export class AnalyticsReport {
  constructor(private readonly props: AnalyticsReportProps) {}

  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get reportType() { return this.props.reportType }
  get reportStatus() { return this.props.reportStatus }
  get dateFrom() { return this.props.dateFrom }
  get dateTo() { return this.props.dateTo }
  get format() { return this.props.format }
  get reportData() { return this.props.reportData }
  get errorMessage() { return this.props.errorMessage }
  get requestedById() { return this.props.requestedById }
  get completedAt() { return this.props.completedAt }
  get expiresAt() { return this.props.expiresAt }
  get createdAt() { return this.props.createdAt }

  get isPending() { return this.props.reportStatus === 'PENDING' }
  get isCompleted() { return this.props.reportStatus === 'COMPLETED' }
  get isFailed() { return this.props.reportStatus === 'FAILED' }
  get isExpired() { return this.props.reportStatus === 'EXPIRED' || new Date() > this.props.expiresAt }

  belongsToOrganization(orgId: string): boolean { return this.props.organizationId === orgId }
  toJSON(): AnalyticsReportProps { return { ...this.props } }
}
