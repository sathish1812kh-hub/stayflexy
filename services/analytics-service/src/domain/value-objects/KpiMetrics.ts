export interface KpiMetrics {
  hotelId: string
  organizationId: string
  period: { from: string; to: string }
  occupancyRate: number     // 0–100
  adr: number               // Average Daily Rate
  revpar: number            // Revenue Per Available Room
  totalRevenue: number
  totalBookings: number
  cancellationRate: number  // 0–100
  averageStayDuration: number // nights
  revenueByChannel: Record<string, number>
  revenueByRoomType: Record<string, number>
}

export interface OccupancyDataPoint {
  date: string
  occupied: number
  total: number
  rate: number  // 0–100
}

export interface RevenueForecast {
  date: string
  estimatedRevenue: number
  confidence: number  // 0–1
}
