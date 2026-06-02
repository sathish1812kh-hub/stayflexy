export const ANALYTICS_EVENTS = {
  AGGREGATION_COMPLETED: 'analytics.aggregation.completed',
  REPORT_GENERATED: 'analytics.report.generated',
} as const

export type AnalyticsPublishEventType = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

export interface AggregationCompletedPayload {
  hotelId: string
  organizationId: string
  targetDate: string
  metrics: {
    occupancyRate: number
    adr: number
    revpar: number
    totalRevenue: number
    bookingCount: number
  }
}

export interface ReportGeneratedPayload {
  reportId: string
  hotelId: string
  organizationId: string
  reportType: string
  format: string
}

// Incoming event types from other services
export const SUBSCRIBED_EVENTS = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_CHECKED_IN: 'booking.checked_in',
  BOOKING_CHECKED_OUT: 'booking.checked_out',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_REFUNDED: 'payment.refunded',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RELEASED: 'inventory.released',
  OTA_SYNC_COMPLETED: 'ota.sync.completed',
} as const
