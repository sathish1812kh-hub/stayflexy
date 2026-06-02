// FILE: src/modules/recommendations/repositories/PrismaRecommendationRepository.ts
import type { Prisma, RecommendationType, RecommendationStatus } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  Recommendation,
  CreateRecommendationData,
  RecommendationFilter,
  RecommendationStatusType,
} from "../types";

type PrismaRecommendation = Prisma.RecommendationGetPayload<Record<string, never>>;

function toRecommendation(r: PrismaRecommendation): Recommendation {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    recommendationType: r.recommendationType as Recommendation["recommendationType"],
    recommendationPayload: r.recommendationPayload as Record<string, unknown>,
    confidenceScore: r.confidenceScore.toNumber(),
    recommendationStatus: r.recommendationStatus as Recommendation["recommendationStatus"],
    explanation: r.explanation,
    expiresAt: r.expiresAt,
    generatedAt: r.generatedAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaRecommendationRepository extends BaseRepository<
  Recommendation,
  CreateRecommendationData,
  { recommendationStatus?: string }
> {
  async findById(id: string): Promise<Nullable<Recommendation>> {
    const r = await this.db.recommendation.findUnique({ where: { id } });
    return r ? toRecommendation(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<Recommendation>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.recommendation.findMany({
        skip,
        take: params.limit,
        orderBy: { generatedAt: "desc" },
      }),
      this.db.recommendation.count(),
    ]);
    return {
      data: records.map(toRecommendation),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(filter: RecommendationFilter): Promise<PaginatedResult<Recommendation>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RecommendationWhereInput = {};
    if (filter.organizationId !== undefined) where.organizationId = filter.organizationId;
    if (filter.hotelId !== undefined) where.hotelId = filter.hotelId;
    if (filter.recommendationType !== undefined) {
      where.recommendationType = filter.recommendationType as RecommendationType;
    }
    if (filter.recommendationStatus !== undefined) {
      where.recommendationStatus = filter.recommendationStatus as RecommendationStatus;
    }

    const [records, total] = await Promise.all([
      this.db.recommendation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { generatedAt: "desc" },
      }),
      this.db.recommendation.count({ where }),
    ]);

    return {
      data: records.map(toRecommendation),
      meta: this.buildPaginationMeta(total, { page, limit }),
    };
  }

  async findPendingByHotel(hotelId: string): Promise<Recommendation[]> {
    const now = new Date();
    const records = await this.db.recommendation.findMany({
      where: {
        hotelId,
        recommendationStatus: "PENDING",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { generatedAt: "desc" },
    });
    return records.map(toRecommendation);
  }

  async create(data: CreateRecommendationData): Promise<Recommendation> {
    const r = await this.db.recommendation.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        recommendationType: data.recommendationType as RecommendationType,
        recommendationPayload: data.recommendationPayload as Prisma.InputJsonValue,
        confidenceScore: data.confidenceScore,
        explanation: data.explanation ?? null,
        expiresAt: data.expiresAt ?? null,
      },
    });
    return toRecommendation(r);
  }

  async update(id: string, data: { recommendationStatus?: string }): Promise<Recommendation> {
    const payload: Prisma.RecommendationUpdateInput = {};
    if (data.recommendationStatus !== undefined) {
      payload.recommendationStatus = data.recommendationStatus as RecommendationStatus;
    }
    const r = await this.db.recommendation.update({ where: { id }, data: payload });
    return toRecommendation(r);
  }

  async updateStatus(id: string, status: RecommendationStatusType): Promise<Recommendation> {
    const r = await this.db.recommendation.update({
      where: { id },
      data: { recommendationStatus: status as RecommendationStatus },
    });
    return toRecommendation(r);
  }

  async expireStale(hotelId: string): Promise<number> {
    const now = new Date();
    const result = await this.db.recommendation.updateMany({
      where: {
        hotelId,
        recommendationStatus: "PENDING",
        expiresAt: { lt: now },
      },
      data: { recommendationStatus: "EXPIRED" },
    });
    return result.count;
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.recommendation.delete({ where: { id } });
  }
}
