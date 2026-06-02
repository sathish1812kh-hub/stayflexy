// FILE: src/modules/analytics/constants/index.ts

export const ANALYTICS_ERRORS = {
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
  SNAPSHOT_NOT_FOUND: "Analytics snapshot not found",
  INVALID_DATE_RANGE: "End date must be after start date",
} as const;

export const DEFAULT_ANALYTICS_DAYS = 30;
export const MAX_DATE_RANGE_DAYS = 365;
