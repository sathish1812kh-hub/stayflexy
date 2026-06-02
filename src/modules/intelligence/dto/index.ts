// FILE: src/modules/intelligence/dto/index.ts
import { z } from "zod";

const INSIGHT_TYPES = [
  "OCCUPANCY_TREND",
  "BOOKING_PATTERN",
  "CANCELLATION_SPIKE",
  "REVENUE_ANOMALY",
  "OPERATIONAL_BOTTLENECK",
  "STAFF_WORKLOAD",
  "PRICING_EFFECTIVENESS",
] as const;

const INSIGHT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;

const ANOMALY_TYPES = [
  "SUSPICIOUS_BOOKING",
  "PAYMENT_ANOMALY",
  "UNUSUAL_CANCELLATION",
  "INVENTORY_MISMATCH",
  "PRICING_OUTLIER",
  "OTA_SYNC_FAILURE",
  "OPERATIONAL_DELAY",
] as const;

export const InsightFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  insightType: z.enum(INSIGHT_TYPES).optional(),
  severity: z.enum(INSIGHT_SEVERITIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const AnomalyFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  anomalyType: z.enum(ANOMALY_TYPES).optional(),
  minRiskScore: z.coerce.number().min(0).max(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const GenerateInsightsDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
});

export type InsightFilterDtoType = z.infer<typeof InsightFilterDto>;
export type AnomalyFilterDtoType = z.infer<typeof AnomalyFilterDto>;
export type GenerateInsightsDtoType = z.infer<typeof GenerateInsightsDto>;
