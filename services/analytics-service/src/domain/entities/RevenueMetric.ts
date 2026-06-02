export interface RevenueMetricProps {
  id: string
  organizationId: string
  hotelId: string
  metricDate: Date
  occupancyRate: number
  adr: number
  revpar: number
  totalRevenue: number
  bookingCount: number
  cancellationRate: number
  createdAt: Date
  updatedAt: Date
}

export class RevenueMetric {
  constructor(private readonly props: RevenueMetricProps) {}
  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get metricDate() { return this.props.metricDate }
  get occupancyRate() { return this.props.occupancyRate }
  get adr() { return this.props.adr }
  get revpar() { return this.props.revpar }
  get totalRevenue() { return this.props.totalRevenue }
  get bookingCount() { return this.props.bookingCount }
  get cancellationRate() { return this.props.cancellationRate }
  toJSON(): RevenueMetricProps { return { ...this.props } }
}
