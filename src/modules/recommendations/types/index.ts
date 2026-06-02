// FILE: src/modules/recommendations/types/index.ts

export type RecommendationTypeType =
  | "ROOM_UPGRADE"
  | "PRICING_ADJUSTMENT"
  | "OCCUPANCY_OPTIMIZATION"
  | "OTA_PERFORMANCE"
  | "STAFFING_ADJUSTMENT"
  | "MAINTENANCE_PRIORITY"
  | "UPSELL_OPPORTUNITY";

export type RecommendationStatusType =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "APPLIED";

export interface Recommendation {
  id: string;
  organizationId: string;
  hotelId: string;
  recommendationType: RecommendationTypeType;
  recommendationPayload: Record<string, unknown>;
  confidenceScore: number; // 0.0–1.0
  recommendationStatus: RecommendationStatusType;
  explanation: string | null;
  expiresAt: Date | null;
  generatedAt: Date;
  updatedAt: Date;
}

export interface CreateRecommendationData {
  organizationId: string;
  hotelId: string;
  recommendationType: RecommendationTypeType;
  recommendationPayload: Record<string, unknown>;
  confidenceScore: number;
  explanation?: string;
  expiresAt?: Date;
}

export interface RecommendationFilter {
  organizationId?: string;
  hotelId?: string;
  recommendationType?: RecommendationTypeType;
  recommendationStatus?: RecommendationStatusType;
  page?: number;
  limit?: number;
}

export interface ScoredRecommendation {
  type: string;
  score: number;
  explanation: string;
  payload: Record<string, unknown>;
}
