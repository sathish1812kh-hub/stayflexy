import type { RevenueMetric } from '../entities/RevenueMetric'

export interface IRevenueMetricRepository {
  findByHotelAndRange(hotelId: string, from: Date, to: Date): Promise<RevenueMetric[]>
  findByHotelAndDate(hotelId: string, date: Date): Promise<RevenueMetric | null>
  upsert(data: UpsertRevenueMetricData): Promise<RevenueMetric>
  findByOrganization(organizationId: string, from: Date, to: Date): Promise<RevenueMetric[]>
}

export interface UpsertRevenueMetricData {
  organizationId: string
  hotelId: string
  metricDate: Date
  occupancyRate: number
  adr: number
  revpar: number
  totalRevenue: number
  bookingCount: number
  cancellationRate: number
}
