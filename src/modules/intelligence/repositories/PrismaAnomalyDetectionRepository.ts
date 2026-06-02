// FILE: src/modules/intelligence/repositories/PrismaAnomalyDetectionRepository.ts
import type { Prisma, AnomalyType } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  AnomalyDetection,
  CreateAnomalyData,
  AnomalyFilter,
} from "../types";

type PrismaAnomalyDetection = Prisma.AnomalyDetectionGetPayload<Record<string, never>>;

function toAnomaly(r: PrismaAnomalyDetection): AnomalyDetection {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    anomalyType: r.anomalyType as AnomalyDetection["anomalyType"],
    anomalyPayload: r.anomalyPayload as Record<string, unknown>,
    riskScore: r.riskScore.toNumber(),
    detectedAt: r.detectedAt,
  };
}

export class PrismaAnomalyDetectionRepository extends BaseRepository<
  AnomalyDetection,
  CreateAnomalyData,
  Record<string, never>
> {
  async findById(id: string): Promise<Nullable<AnomalyDetection>> {
    const r = await this.db.anomalyDetection.findUnique({ where: { id } });
    return r ? toAnomaly(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<AnomalyDetection>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.anomalyDetection.findMany({
        skip,
        take: params.limit,
        orderBy: { detectedAt: "desc" },
      }),
      this.db.anomalyDetection.count(),
    ]);
    return {
      data: records.map(toAnomaly),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(filter: AnomalyFilter): Promise<PaginatedResult<AnomalyDetection>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AnomalyDetectionWhereInput = {};
    if (filter.organizationId !== undefined) where.organizationId = filter.organizationId;
    if (filter.hotelId !== undefined) where.hotelId = filter.hotelId;
    if (filter.anomalyType !== undefined) {
      where.anomalyType = filter.anomalyType as AnomalyType;
    }
    if (filter.minRiskScore !== undefined) {
      where.riskScore = { gte: filter.minRiskScore };
    }

    const [records, total] = await Promise.all([
      this.db.anomalyDetection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { detectedAt: "desc" },
      }),
      this.db.anomalyDetection.count({ where }),
    ]);

    return {
      data: records.map(toAnomaly),
      meta: this.buildPaginationMeta(total, { page, limit }),
    };
  }

  async findHighRisk(hotelId: string, threshold: number): Promise<AnomalyDetection[]> {
    const records = await this.db.anomalyDetection.findMany({
      where: {
        hotelId,
        riskScore: { gte: threshold },
      },
      orderBy: { riskScore: "desc" },
    });
    return records.map(toAnomaly);
  }

  async create(data: CreateAnomalyData): Promise<AnomalyDetection> {
    const r = await this.db.anomalyDetection.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        anomalyType: data.anomalyType as AnomalyType,
        anomalyPayload: data.anomalyPayload as Prisma.InputJsonValue,
        riskScore: data.riskScore,
      },
    });
    return toAnomaly(r);
  }

  update(_id: string, _data: Record<string, never>): Promise<AnomalyDetection> {
    throw new Error("Anomaly detections are immutable");
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.anomalyDetection.delete({ where: { id } });
  }
}
