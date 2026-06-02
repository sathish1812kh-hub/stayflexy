// FILE: src/modules/recommendations/services/RecommendationService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { ForbiddenError, NotFoundError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaRecommendationRepository } from "../repositories/PrismaRecommendationRepository";
import type {
  Recommendation,
  RecommendationFilter,
  RecommendationTypeType,
} from "../types";
import type {
  GenerateRecommendationsDtoType,
  RecommendationFilterDtoType,
  UpdateRecommendationStatusDtoType,
} from "../dto";
import {
  RECOMMENDATION_ERRORS,
  CONFIDENCE_THRESHOLDS,
  RECOMMENDATION_TTL_HOURS,
} from "../constants";
import {
  PricingRecommendationEngine,
  OccupancyOptimizationEngine,
  StaffingRecommendationEngine,
  OTAPerformanceEngine,
} from "../engines";

export class RecommendationService extends BaseService {
  protected readonly moduleName = "RecommendationService";

  constructor(
    private readonly recommendationRepo: PrismaRecommendationRepository
  ) {
    super();
  }

  private async validateHotelAccess(hotelId: string, orgId: string): Promise<void> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!hotel) throw new ForbiddenError(RECOMMENDATION_ERRORS.HOTEL_NOT_FOUND);
  }

  private computeExpiresAt(type: RecommendationTypeType): Date | undefined {
    const ttlMap: Partial<Record<RecommendationTypeType, number>> = {
      PRICING_ADJUSTMENT: RECOMMENDATION_TTL_HOURS.PRICING_ADJUSTMENT,
      OCCUPANCY_OPTIMIZATION: RECOMMENDATION_TTL_HOURS.OCCUPANCY_OPTIMIZATION,
      ROOM_UPGRADE: RECOMMENDATION_TTL_HOURS.ROOM_UPGRADE,
      OTA_PERFORMANCE: RECOMMENDATION_TTL_HOURS.OTA_PERFORMANCE,
      STAFFING_ADJUSTMENT: RECOMMENDATION_TTL_HOURS.STAFFING_ADJUSTMENT,
    };
    const hours = ttlMap[type];
    if (hours === undefined) return undefined;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  async generateRecommendations(
    dto: GenerateRecommendationsDtoType,
    orgId: string
  ): Promise<Recommendation[]> {
    return this.execute("generateRecommendations", async () => {
      await this.validateHotelAccess(dto.hotelId, orgId);

      // Expire stale recommendations first
      await this.recommendationRepo.expireStale(dto.hotelId);

      const requestedTypes = new Set(dto.types);
      const engines: Array<() => Promise<{ type: string; score: number; explanation: string; payload: Record<string, unknown> } | null>> = [];

      if (requestedTypes.has("PRICING_ADJUSTMENT")) {
        engines.push(() => PricingRecommendationEngine.score(dto.hotelId, orgId));
      }
      if (requestedTypes.has("OCCUPANCY_OPTIMIZATION")) {
        engines.push(() => OccupancyOptimizationEngine.score(dto.hotelId, orgId));
      }
      if (requestedTypes.has("STAFFING_ADJUSTMENT")) {
        engines.push(() => StaffingRecommendationEngine.score(dto.hotelId, orgId));
      }
      if (requestedTypes.has("OTA_PERFORMANCE")) {
        engines.push(() => OTAPerformanceEngine.score(dto.hotelId, orgId));
      }

      const results = await Promise.allSettled(engines.map((fn) => fn()));

      const created: Recommendation[] = [];

      for (const result of results) {
        if (result.status !== "fulfilled" || result.value === null) continue;

        const scored = result.value;
        if (scored.score <= CONFIDENCE_THRESHOLDS.LOW) continue;

        const recType = scored.type as RecommendationTypeType;
        const expiresAt = this.computeExpiresAt(recType);

        const rec = await this.recommendationRepo.create({
          organizationId: orgId,
          hotelId: dto.hotelId,
          recommendationType: recType,
          recommendationPayload: scored.payload,
          confidenceScore: scored.score,
          explanation: scored.explanation,
          expiresAt,
        });

        created.push(rec);
      }

      this.getLogger().info("Recommendations generated", {
        hotelId: dto.hotelId,
        count: created.length,
      });

      return created;
    });
  }

  async listRecommendations(
    filter: RecommendationFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<Recommendation>> {
    return this.execute("listRecommendations", async () => {
      await this.validateHotelAccess(filter.hotelId, orgId);

      const repoFilter: RecommendationFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        recommendationType: filter.recommendationType,
        recommendationStatus: filter.recommendationStatus,
        page: filter.page,
        limit: filter.limit,
      };

      return this.recommendationRepo.findManyFiltered(repoFilter);
    });
  }

  async getRecommendation(id: string, orgId: string): Promise<Recommendation> {
    return this.execute("getRecommendation", async () => {
      const rec = await this.recommendationRepo.findById(id);
      if (!rec) throw new NotFoundError(RECOMMENDATION_ERRORS.NOT_FOUND);
      if (rec.organizationId !== orgId) {
        throw new ForbiddenError(RECOMMENDATION_ERRORS.ACCESS_DENIED);
      }
      return rec;
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateRecommendationStatusDtoType,
    orgId: string
  ): Promise<Recommendation> {
    return this.execute("updateStatus", async () => {
      const rec = await this.recommendationRepo.findById(id);
      if (!rec) throw new NotFoundError(RECOMMENDATION_ERRORS.NOT_FOUND);
      if (rec.organizationId !== orgId) {
        throw new ForbiddenError(RECOMMENDATION_ERRORS.ACCESS_DENIED);
      }
      return this.recommendationRepo.updateStatus(id, dto.recommendationStatus);
    });
  }
}
