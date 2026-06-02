// FILE: src/modules/synchronization/repositories/PrismaSyncJobRepository.ts
import { type Prisma, Prisma as PrismaNamespace } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type {
  SyncJob,
  CreateSyncJobData,
  UpdateSyncJobData,
  SyncJobFilter,
  SyncStatusType,
  SyncTypeType,
} from "../types";

type PrismaSyncJob = Prisma.SyncJobGetPayload<Record<string, never>>;

function toSyncJob(r: PrismaSyncJob): SyncJob {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    providerId: r.providerId,
    syncType: r.syncType as SyncTypeType,
    syncStatus: r.syncStatus as SyncStatusType,
    idempotencyKey: r.idempotencyKey,
    startedAt: r.startedAt ?? null,
    completedAt: r.completedAt ?? null,
    retryCount: r.retryCount,
    maxRetries: r.maxRetries,
    errorMessage: r.errorMessage ?? null,
    payload: r.payload as Record<string, unknown> | null,
    createdById: r.createdById,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaSyncJobRepository extends BaseRepository<
  SyncJob,
  CreateSyncJobData,
  UpdateSyncJobData
> {
  async findById(id: string): Promise<SyncJob | null> {
    const r = await this.db.syncJob.findFirst({ where: { id } });
    return r ? toSyncJob(r) : null;
  }

  async findByIdempotencyKey(key: string): Promise<SyncJob | null> {
    const r = await this.db.syncJob.findUnique({ where: { idempotencyKey: key } });
    return r ? toSyncJob(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<SyncJob>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.syncJob.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.syncJob.count(),
    ]);
    return {
      data: records.map(toSyncJob),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async findManyFiltered(filter: SyncJobFilter): Promise<PaginatedResult<SyncJob>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SyncJobWhereInput = {
      ...(filter.organizationId !== undefined && { organizationId: filter.organizationId }),
      ...(filter.hotelId !== undefined && { hotelId: filter.hotelId }),
      ...(filter.providerId !== undefined && { providerId: filter.providerId }),
      ...(filter.syncType !== undefined && {
        syncType: filter.syncType as Prisma.EnumSyncTypeFilter,
      }),
      ...(filter.syncStatus !== undefined && {
        syncStatus: filter.syncStatus as Prisma.EnumSyncStatusFilter,
      }),
    };

    const [records, total] = await Promise.all([
      this.db.syncJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.syncJob.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: records.map(toSyncJob),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findPendingRetryJobs(): Promise<SyncJob[]> {
    // Raw query: retryCount < maxRetries using Prisma column comparison via $queryRaw is verbose;
    // instead fetch with a reasonable upper bound and filter in memory.
    const records = await this.db.syncJob.findMany({
      where: { syncStatus: "RETRYING" },
      orderBy: { createdAt: "asc" },
    });
    return records
      .filter((r) => r.retryCount < r.maxRetries)
      .map(toSyncJob);
  }

  async create(data: CreateSyncJobData): Promise<SyncJob> {
    const r = await this.db.syncJob.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        providerId: data.providerId,
        syncType: data.syncType as Parameters<
          typeof this.db.syncJob.create
        >[0]["data"]["syncType"],
        syncStatus: "PENDING",
        idempotencyKey: data.idempotencyKey,
        retryCount: 0,
        maxRetries: data.maxRetries ?? 3,
        errorMessage: null,
        payload: (data.payload ?? PrismaNamespace.JsonNull) as PrismaNamespace.InputJsonValue,
        createdById: data.createdById,
      },
    });
    return toSyncJob(r);
  }

  async update(id: string, data: UpdateSyncJobData): Promise<SyncJob> {
    const payload: Prisma.SyncJobUpdateInput = {};
    if (data.syncStatus !== undefined) payload.syncStatus = data.syncStatus;
    if (data.startedAt !== undefined) payload.startedAt = data.startedAt;
    if (data.completedAt !== undefined) payload.completedAt = data.completedAt;
    if (data.retryCount !== undefined) payload.retryCount = data.retryCount;
    if (data.errorMessage !== undefined) payload.errorMessage = data.errorMessage;
    if (data.payload !== undefined)
      payload.payload = (data.payload ?? PrismaNamespace.JsonNull) as PrismaNamespace.InputJsonValue;

    const r = await this.db.syncJob.update({ where: { id }, data: payload });
    return toSyncJob(r);
  }

  async updateStatus(
    id: string,
    status: SyncStatusType,
    extra?: Partial<UpdateSyncJobData>
  ): Promise<SyncJob> {
    const merged: UpdateSyncJobData = { ...extra, syncStatus: status };
    return this.update(id, merged);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.syncJob.delete({ where: { id } });
  }
}
