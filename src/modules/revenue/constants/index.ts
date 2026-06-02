// FILE: src/modules/revenue/constants/index.ts

export const REVENUE_ERRORS = {
  METRIC_NOT_FOUND: "Revenue metric not found",
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
  INVALID_DATE_RANGE: "End date must be after start date",
} as const;

export const FORECAST_METHODOLOGY = "LINEAR_EXTRAPOLATION";
export const MAX_FORECAST_DAYS = 90;
export const DEFAULT_CONFIDENCE = 0.70;
