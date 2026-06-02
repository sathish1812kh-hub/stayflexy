// FILE: src/modules/intelligence/constants/index.ts

export const INTELLIGENCE_ERRORS = {
  INSIGHT_NOT_FOUND: "Operational insight not found",
  ANOMALY_NOT_FOUND: "Anomaly not found",
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
} as const;

export const RISK_THRESHOLDS = {
  CRITICAL: 0.70,
  WARNING: 0.40,
  INFO: 0.0,
} as const;
