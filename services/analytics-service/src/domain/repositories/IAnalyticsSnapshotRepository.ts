import type { AnalyticsSnapshot } from '../entities/AnalyticsSnapshot'

export interface IAnalyticsSnapshotRepository {
  findByHotelAndType(hotelId: string, snapshotType: string, date: Date): Promise<AnalyticsSnapshot | null>
  findRecentByHotel(hotelId: string, snapshotType: string, limit?: number): Promise<AnalyticsSnapshot[]>
  upsert(data: UpsertSnapshotData): Promise<AnalyticsSnapshot>
}

export interface UpsertSnapshotData {
  organizationId: string
  hotelId: string
  snapshotType: string
  snapshotDate: Date
  metricsPayload: unknown
}
