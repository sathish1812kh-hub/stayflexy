// FILE: src/modules/recommendations/container.ts
import { PrismaRecommendationRepository } from "./repositories/PrismaRecommendationRepository";
import { RecommendationService } from "./services/RecommendationService";

const repo = new PrismaRecommendationRepository();
export const recommendationService = new RecommendationService(repo);
