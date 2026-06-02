// FILE: src/modules/analytics/repositories/PrismaAnalyticsSnapshotRepository.ts
import type { Prisma, $Enums } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import { BadRequestError } from "@errors/HttpError";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  AnalyticsSnapshot,
  CreateSnapshotData,
  SnapshotFilter,
  SnapshotTypeType,
} from "../types";
import { ANALYTICS_ERRORS } from "../constants";

type PrismaSnapshotRecord = Prisma.AnalyticsSnapshotGetPayload<Record<string, never>>;

function toAnalyticsSnapshot(r: PrismaSnapshotRecord): AnalyticsSnapshot {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    snapshotType: r.snapshotType as SnapshotTypeType,
    snapshotDate: r.snapshotDate,
    metricsPayload: r.metricsPayload as Record<string, unknown>,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaAnalyticsSnapshotRepository extends BaseRepository<
  AnalyticsSnapshot,
  CreateSnapshotData,
  Record<string, never>
> {
  async findById(id: string): Promise<Nullable<AnalyticsSnapshot>> {
    const r = await this.db.analyticsSnapshot.findFirst({ where: { id } });
    return r ? toAnalyticsSnapshot(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<AnalyticsSnapshot>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.analyticsSnapshot.findMany({
        skip,
        take: params.limit,
        orderBy: { snapshotDate: "desc" },
      }),
      this.db.analyticsSnapshot.count(),
    ]);
    return {
      data: records.map(toAnalyticsSnapshot),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(
    filter: SnapshotFilter
  ): Promise<PaginatedResult<AnalyticsSnapshot>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AnalyticsSnapshotWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.hotelId && { hotelId: filter.hotelId }),
      ...(filter.snapshotType && {
        snapshotType: filter.snapshotType as $Enums.SnapshotType,
      }),
      ...(filter.startDate || filter.endDate
        ? {
            snapshotDate: {
              ...(filter.startDate ? { gte: filter.startDate } : {}),
              ...(filter.endDate ? { lte: filter.endDate } : {}),
            },
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.db.analyticsSnapshot.findMany({
        where,
        skip,
        take: limit,
        orderBy: { snapshotDate: "desc" },
      }),
      this.db.analyticsSnapshot.count({ where }),
    ]);

    return {
      data: records.map(toAnalyticsSnapshot),
      meta: this.buildPaginationMeta(total, { page, limit }),
    };
  }

  async upsertSnapshot(data: CreateSnapshotData): Promise<AnalyticsSnapshot> {
    const r = await this.db.analyticsSnapshot.upsert({
      where: {
        hotelId_snapshotType_snapshotDate: {
          hotelId: data.hotelId,
          snapshotType: data.snapshotType as $Enums.SnapshotType,
          snapshotDate: data.snapshotDate,
        },
      },
      create: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        snapshotType: data.snapshotType as $Enums.SnapshotType,
        snapshotDate: data.snapshotDate,
        metricsPayload: data.metricsPayload as Prisma.InputJsonValue,
      },
      update: {
        organizationId: data.organizationId,
        metricsPayload: data.metricsPayload as Prisma.InputJsonValue,
      },
    });
    return toAnalyticsSnapshot(r);
  }

  async create(data: CreateSnapshotData): Promise<AnalyticsSnapshot> {
    const r = await this.db.analyticsSnapshot.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        snapshotType: data.snapshotType as $Enums.SnapshotType,
        snapshotDate: data.snapshotDate,
        metricsPayload: data.metricsPayload as Prisma.InputJsonValue,
      },
    });
    return toAnalyticsSnapshot(r);
  }

  async update(id: string, _data: Record<string, never>): Promise<AnalyticsSnapshot> {
    throw new BadRequestError(ANALYTICS_ERRORS.SNAPSHOT_NOT_FOUND, {
      reason: "Snapshots are immutable",
      id,
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.analyticsSnapshot.delete({ where: { id } });
  }
}
