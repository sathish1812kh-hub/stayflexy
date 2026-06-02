// FILE: src/modules/recommendations/index.ts

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Recommendation,
  CreateRecommendationData,
  RecommendationFilter,
  ScoredRecommendation,
  RecommendationTypeType,
  RecommendationStatusType,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  RECOMMENDATION_ERRORS,
  CONFIDENCE_THRESHOLDS,
  RECOMMENDATION_TTL_HOURS,
} from "./constants";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export {
  RecommendationFilterDto,
  UpdateRecommendationStatusDto,
  GenerateRecommendationsDto,
} from "./dto";
export type {
  RecommendationFilterDtoType,
  UpdateRecommendationStatusDtoType,
  GenerateRecommendationsDtoType,
} from "./dto";

// ─── Validators ───────────────────────────────────────────────────────────────
export {
  validateRecommendationFilter,
  validateUpdateRecommendationStatus,
  validateGenerateRecommendations,
} from "./validators";

// ─── Repositories ─────────────────────────────────────────────────────────────
export { PrismaRecommendationRepository } from "./repositories";

// ─── Engines ──────────────────────────────────────────────────────────────────
export {
  PricingRecommendationEngine,
  OccupancyOptimizationEngine,
  StaffingRecommendationEngine,
  OTAPerformanceEngine,
} from "./engines";

// ─── Services ─────────────────────────────────────────────────────────────────
export { RecommendationService } from "./services";

// ─── Container ────────────────────────────────────────────────────────────────
export { recommendationService } from "./container";
