// FILE: src/modules/revenue/types/index.ts

export interface RevenueMetric {
  id: string;
  organizationId: string;
  hotelId: string;
  metricDate: Date;
  occupancyRate: number;
  adr: number;
  revpar: number;
  totalRevenue: number;
  bookingCount: number;
  cancellationRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRevenueMetricData {
  organizationId: string;
  hotelId: string;
  metricDate: Date;
  occupancyRate: number;
  adr: number;
  revpar: number;
  totalRevenue: number;
  bookingCount: number;
  cancellationRate: number;
}

export type UpdateRevenueMetricData = Partial<{
  occupancyRate: number;
  adr: number;
  revpar: number;
  totalRevenue: number;
  bookingCount: number;
  cancellationRate: number;
}>;

export interface RevenueMetricFilter {
  organizationId?: string;
  hotelId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface OccupancyResult {
  hotelId: string;
  date: Date;
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
}

export interface ForecastPeriod {
  date: Date;
  forecastedOccupancy: number;
  forecastedRevenue: number;
  confidence: number;
}

export interface RevenueForecast {
  hotelId: string;
  forecastFrom: Date;
  forecastTo: Date;
  periods: ForecastPeriod[];
  methodology: string;
}

export type SnapshotTypeType =
  | "DAILY_BOOKING"
  | "WEEKLY_BOOKING"
  | "MONTHLY_BOOKING"
  | "PAYMENT_SUMMARY"
  | "OTA_PERFORMANCE"
  | "HOUSEKEEPING_PERFORMANCE"
  | "OPERATIONAL_SUMMARY";
