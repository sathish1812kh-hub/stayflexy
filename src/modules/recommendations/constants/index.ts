// FILE: src/modules/recommendations/constants/index.ts

export const RECOMMENDATION_ERRORS = {
  NOT_FOUND: "Recommendation not found",
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
  ACCESS_DENIED: "Access denied to this recommendation",
} as const;

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.75,
  MEDIUM: 0.50,
  LOW: 0.25,
} as const;

export const RECOMMENDATION_TTL_HOURS = {
  PRICING_ADJUSTMENT: 4,
  OCCUPANCY_OPTIMIZATION: 24,
  ROOM_UPGRADE: 12,
  OTA_PERFORMANCE: 48,
  STAFFING_ADJUSTMENT: 8,
} as const;
