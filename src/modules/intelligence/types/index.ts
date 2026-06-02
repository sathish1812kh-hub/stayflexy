// FILE: src/modules/intelligence/types/index.ts

export type InsightTypeType =
  | "OCCUPANCY_TREND"
  | "BOOKING_PATTERN"
  | "CANCELLATION_SPIKE"
  | "REVENUE_ANOMALY"
  | "OPERATIONAL_BOTTLENECK"
  | "STAFF_WORKLOAD"
  | "PRICING_EFFECTIVENESS";

export type InsightSeverityType = "INFO" | "WARNING" | "CRITICAL";

export type AnomalyTypeType =
  | "SUSPICIOUS_BOOKING"
  | "PAYMENT_ANOMALY"
  | "UNUSUAL_CANCELLATION"
  | "INVENTORY_MISMATCH"
  | "PRICING_OUTLIER"
  | "OTA_SYNC_FAILURE"
  | "OPERATIONAL_DELAY";

export interface OperationalInsight {
  id: string;
  organizationId: string;
  hotelId: string;
  insightType: InsightTypeType;
  insightPayload: Record<string, unknown>;
  severity: InsightSeverityType;
  generatedAt: Date;
}

export interface CreateInsightData {
  organizationId: string;
  hotelId: string;
  insightType: InsightTypeType;
  insightPayload: Record<string, unknown>;
  severity: InsightSeverityType;
}

export interface AnomalyDetection {
  id: string;
  organizationId: string;
  hotelId: string;
  anomalyType: AnomalyTypeType;
  anomalyPayload: Record<string, unknown>;
  riskScore: number; // 0.0–1.0
  detectedAt: Date;
}

export interface CreateAnomalyData {
  organizationId: string;
  hotelId: string;
  anomalyType: AnomalyTypeType;
  anomalyPayload: Record<string, unknown>;
  riskScore: number;
}

export interface InsightFilter {
  organizationId?: string;
  hotelId?: string;
  insightType?: InsightTypeType;
  severity?: InsightSeverityType;
  page?: number;
  limit?: number;
}

export interface AnomalyFilter {
  organizationId?: string;
  hotelId?: string;
  anomalyType?: AnomalyTypeType;
  minRiskScore?: number;
  page?: number;
  limit?: number;
}
