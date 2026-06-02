export const PRICING_EVENTS = {
  PRICING_UPDATED: 'pricing.updated',
  PRICING_RULE_CREATED: 'pricing.rule.created',
  PRICING_RULE_UPDATED: 'pricing.rule.updated',
  PRICING_SYNC_COMPLETED: 'pricing.sync.completed',
  SURGE_PRICING_APPLIED: 'pricing.surge.applied',
  SURGE_PRICING_REMOVED: 'pricing.surge.removed',
} as const

export type PricingEventType = (typeof PRICING_EVENTS)[keyof typeof PRICING_EVENTS]

export interface PricingUpdatedPayload {
  hotelId: string
  organizationId: string
  roomTypeId: string
  targetDate: string
  previousRate: number
  newRate: number
  effectiveMultiplier: number
  triggeredBy: string
}

export interface PricingRuleCreatedPayload {
  ruleId: string
  hotelId: string
  organizationId: string
  ruleName: string
  pricingStrategy: string
  createdById: string
}

export interface PricingSyncCompletedPayload {
  hotelId: string
  organizationId: string
  otaProviderId: string
  syncedRatesCount: number
  failedRatesCount: number
  targetDateRange: { from: string; to: string }
}

export interface SurgePricingPayload {
  hotelId: string
  organizationId: string
  roomTypeId?: string
  surgeMultiplier: number
  reason: string
  expiresAt: string
  appliedById: string
}

// Events consumed from other services
export const SUBSCRIBED_EVENTS = {
  BOOKING_CREATED: 'booking.created',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_CHECKED_OUT: 'booking.checked_out',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_RELEASED: 'inventory.released',
  OTA_SYNC_COMPLETED: 'ota.sync.completed',
  ANALYTICS_AGGREGATION_COMPLETED: 'analytics.aggregation.completed',
} as const
