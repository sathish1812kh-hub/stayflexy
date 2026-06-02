// FILE: src/modules/recommendations/dto/index.ts
import { z } from "zod";

const RECOMMENDATION_TYPES = [
  "ROOM_UPGRADE",
  "PRICING_ADJUSTMENT",
  "OCCUPANCY_OPTIMIZATION",
  "OTA_PERFORMANCE",
  "STAFFING_ADJUSTMENT",
  "MAINTENANCE_PRIORITY",
  "UPSELL_OPPORTUNITY",
] as const;

const RECOMMENDATION_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "APPLIED",
] as const;

export const RecommendationFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  recommendationType: z.enum(RECOMMENDATION_TYPES).optional(),
  recommendationStatus: z.enum(RECOMMENDATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const UpdateRecommendationStatusDto = z.object({
  recommendationStatus: z.enum(["ACCEPTED", "REJECTED", "APPLIED"]),
});

export const GenerateRecommendationsDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  types: z.array(z.enum(RECOMMENDATION_TYPES)).default([...RECOMMENDATION_TYPES]),
});

export type RecommendationFilterDtoType = z.infer<typeof RecommendationFilterDto>;
export type UpdateRecommendationStatusDtoType = z.infer<typeof UpdateRecommendationStatusDto>;
export type GenerateRecommendationsDtoType = z.infer<typeof GenerateRecommendationsDto>;
