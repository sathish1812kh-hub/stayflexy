// FILE: src/modules/analytics/types/index.ts

export type SnapshotTypeType =
  | "DAILY_BOOKING"
  | "WEEKLY_BOOKING"
  | "MONTHLY_BOOKING"
  | "PAYMENT_SUMMARY"
  | "OTA_PERFORMANCE"
  | "HOUSEKEEPING_PERFORMANCE"
  | "OPERATIONAL_SUMMARY";

export interface AnalyticsSnapshot {
  id: string;
  organizationId: string;
  hotelId: string;
  snapshotType: SnapshotTypeType;
  snapshotDate: Date;
  metricsPayload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSnapshotData {
  organizationId: string;
  hotelId: string;
  snapshotType: SnapshotTypeType;
  snapshotDate: Date;
  metricsPayload: Record<string, unknown>;
}

export interface SnapshotFilter {
  organizationId?: string;
  hotelId?: string;
  snapshotType?: SnapshotTypeType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface BookingAnalytics {
  hotelId: string;
  period: { start: Date; end: Date };
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  bookingsBySource: Record<string, number>;
  avgBookingValue: number;
  totalRevenue: number;
}

export interface PaymentAnalytics {
  hotelId: string;
  period: { start: Date; end: Date };
  totalPayments: number;
  successfulPayments: number;
  totalRevenue: number;
  byMethod: Record<string, number>;
  refundedAmount: number;
}

export interface OTAAnalytics {
  hotelId: string;
  period: { start: Date; end: Date };
  totalReservations: number;
  importedCount: number;
  failedCount: number;
  duplicateCount: number;
  byProvider: Record<string, number>;
  importSuccessRate: number;
}

export interface OperationsAnalytics {
  hotelId: string;
  period: { start: Date; end: Date };
  totalHousekeepingTasks: number;
  completedTasks: number;
  pendingTasks: number;
  avgCompletionRate: number;
  totalMaintenanceTickets: number;
  resolvedTickets: number;
  openTickets: number;
}
