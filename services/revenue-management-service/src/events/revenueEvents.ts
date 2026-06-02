export const REVENUE_EVENTS = {
  FORECAST_GENERATED: 'pricing.forecast.generated',
  REVENUE_OPTIMIZED: 'pricing.optimized',
  TARGET_CREATED: 'revenue.target.created',
  TARGET_UPDATED: 'revenue.target.updated',
  RECOMMENDATION_GENERATED: 'pricing.recommendation.generated',
} as const

export type RevenueEventType = (typeof REVENUE_EVENTS)[keyof typeof REVENUE_EVENTS]

export interface ForecastGeneratedPayload {
  hotelId: string
  organizationId: string
  forecastDates: string[]
  averageProjectedOccupancy: number
  averageProjectedRevPar: number
  confidence: string
}

export interface RevenueOptimizedPayload {
  hotelId: string
  organizationId: string
  targetPeriod: string
  projectedRevenue: number
  projectedRevPar: number
  projectedOccupancy: number
  recommendedAdr: number
}

export interface RecommendationGeneratedPayload {
  hotelId: string
  organizationId: string
  roomTypeId: string
  targetDate: string
  recommendedPrice: number
  confidenceScore: number
}

export const SUBSCRIBED_EVENTS = {
  ANALYTICS_AGGREGATION_COMPLETED: 'analytics.aggregation.completed',
  PRICING_UPDATED: 'pricing.updated',
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
} as const
