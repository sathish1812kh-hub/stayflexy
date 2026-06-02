export interface AnalyticsSnapshotProps {
  id: string
  organizationId: string
  hotelId: string
  snapshotType: string
  snapshotDate: Date
  metricsPayload: unknown
  createdAt: Date
  updatedAt: Date
}

export class AnalyticsSnapshot {
  constructor(private readonly props: AnalyticsSnapshotProps) {}
  get id() { return this.props.id }
  get hotelId() { return this.props.hotelId }
  get snapshotType() { return this.props.snapshotType }
  get snapshotDate() { return this.props.snapshotDate }
  get metricsPayload() { return this.props.metricsPayload }
  toJSON(): AnalyticsSnapshotProps { return { ...this.props } }
}
