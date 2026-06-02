// FILE: src/modules/intelligence/repositories/PrismaOperationalInsightRepository.ts
import type { Prisma, InsightType, InsightSeverity } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  OperationalInsight,
  CreateInsightData,
  InsightFilter,
} from "../types";

type PrismaOperationalInsight = Prisma.OperationalInsightGetPayload<Record<string, never>>;

function toInsight(r: PrismaOperationalInsight): OperationalInsight {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    insightType: r.insightType as OperationalInsight["insightType"],
    insightPayload: r.insightPayload as Record<string, unknown>,
    severity: r.severity as OperationalInsight["severity"],
    generatedAt: r.generatedAt,
  };
}

export class PrismaOperationalInsightRepository extends BaseRepository<
  OperationalInsight,
  CreateInsightData,
  Record<string, never>
> {
  async findById(id: string): Promise<Nullable<OperationalInsight>> {
    const r = await this.db.operationalInsight.findUnique({ where: { id } });
    return r ? toInsight(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<OperationalInsight>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.operationalInsight.findMany({
        skip,
        take: params.limit,
        orderBy: { generatedAt: "desc" },
      }),
      this.db.operationalInsight.count(),
    ]);
    return {
      data: records.map(toInsight),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(filter: InsightFilter): Promise<PaginatedResult<OperationalInsight>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OperationalInsightWhereInput = {};
    if (filter.organizationId !== undefined) where.organizationId = filter.organizationId;
    if (filter.hotelId !== undefined) where.hotelId = filter.hotelId;
    if (filter.insightType !== undefined) {
      where.insightType = filter.insightType as InsightType;
    }
    if (filter.severity !== undefined) {
      where.severity = filter.severity as InsightSeverity;
    }

    const [records, total] = await Promise.all([
      this.db.operationalInsight.findMany({
        where,
        skip,
        take: limit,
        orderBy: { generatedAt: "desc" },
      }),
      this.db.operationalInsight.count({ where }),
    ]);

    return {
      data: records.map(toInsight),
      meta: this.buildPaginationMeta(total, { page, limit }),
    };
  }

  async create(data: CreateInsightData): Promise<OperationalInsight> {
    const r = await this.db.operationalInsight.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        insightType: data.insightType as InsightType,
        insightPayload: data.insightPayload as Prisma.InputJsonValue,
        severity: data.severity as InsightSeverity,
      },
    });
    return toInsight(r);
  }

  update(_id: string, _data: Record<string, never>): Promise<OperationalInsight> {
    throw new Error("Insights are immutable");
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.operationalInsight.delete({ where: { id } });
  }
}
