import { type Prisma } from "@prisma/client";
import { BaseRepository, type PrismaTransactionClient } from "@lib/baseRepository";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type {
  BackgroundJob,
  CreateBackgroundJobData,
  UpdateBackgroundJobData,
  JobFilter,
  BackgroundJobStatusType,
} from "../types";

type PrismaJob = Prisma.BackgroundJobGetPayload<Record<string, never>>;

function toJob(r: PrismaJob): BackgroundJob {
  return {
    id: r.id,
    jobType: r.jobType,
    jobStatus: r.jobStatus as BackgroundJobStatusType,
    payload: r.payload as Record<string, unknown> | null,
    retryCount: r.retryCount,
    maxRetries: r.maxRetries,
    idempotencyKey: r.idempotencyKey ?? null,
    scheduledAt: r.scheduledAt ?? null,
    startedAt: r.startedAt ?? null,
    completedAt: r.completedAt ?? null,
    failedReason: r.failedReason ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaBackgroundJobRepository extends BaseRepository<
  BackgroundJob,
  CreateBackgroundJobData,
  UpdateBackgroundJobData
> {
  async findById(id: string): Promise<BackgroundJob | null> {
    const r = await this.db.backgroundJob.findFirst({ where: { id } });
    return r ? toJob(r) : null;
  }

  async findByIdempotencyKey(key: string): Promise<BackgroundJob | null> {
    const r = await this.db.backgroundJob.findFirst({ where: { idempotencyKey: key } });
    return r ? toJob(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<BackgroundJob>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.backgroundJob.findMany({ skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.backgroundJob.count(),
    ]);
    return { data: records.map(toJob), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: JobFilter): Promise<PaginatedResult<BackgroundJob>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.BackgroundJobWhereInput = {
      ...(filter.jobType && { jobType: filter.jobType }),
      ...(filter.jobStatus && { jobStatus: filter.jobStatus as PrismaJob["jobStatus"] }),
    };

    const [records, total] = await Promise.all([
      this.db.backgroundJob.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      this.db.backgroundJob.count({ where }),
    ]);
    return { data: records.map(toJob), meta: this.buildPaginationMeta(total, params) };
  }

  async findPendingJobs(): Promise<BackgroundJob[]> {
    const now = new Date();
    const records = await this.db.backgroundJob.findMany({
      where: {
        jobStatus: "PENDING",
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      },
      orderBy: { scheduledAt: "asc" },
      take: 50,
    });
    return records.map(toJob);
  }

  async create(data: CreateBackgroundJobData): Promise<BackgroundJob> {
    const r = await this.db.backgroundJob.create({
      data: {
        jobType: data.jobType,
        payload: data.payload as Prisma.InputJsonValue | undefined,
        maxRetries: data.maxRetries ?? 3,
        idempotencyKey: data.idempotencyKey ?? null,
        scheduledAt: data.scheduledAt ?? null,
      },
    });
    return toJob(r);
  }

  async update(id: string, data: UpdateBackgroundJobData): Promise<BackgroundJob> {
    const payload: Prisma.BackgroundJobUpdateInput = {};
    if (data.jobStatus !== undefined) payload.jobStatus = data.jobStatus as PrismaJob["jobStatus"];
    if (data.retryCount !== undefined) payload.retryCount = data.retryCount;
    if (data.startedAt !== undefined) payload.startedAt = data.startedAt;
    if (data.completedAt !== undefined) payload.completedAt = data.completedAt;
    if (data.failedReason !== undefined) payload.failedReason = data.failedReason;
    const r = await this.db.backgroundJob.update({ where: { id }, data: payload });
    return toJob(r);
  }

  async updateStatus(
    id: string,
    status: BackgroundJobStatusType,
    extra?: Partial<UpdateBackgroundJobData>,
    tx?: PrismaTransactionClient
  ): Promise<BackgroundJob> {
    const db = tx ?? this.db;
    const r = await db.backgroundJob.update({
      where: { id },
      data: {
        jobStatus: status as PrismaJob["jobStatus"],
        ...(extra?.startedAt ? { startedAt: extra.startedAt } : {}),
        ...(extra?.completedAt ? { completedAt: extra.completedAt } : {}),
        ...(extra?.failedReason ? { failedReason: extra.failedReason } : {}),
        ...(extra?.retryCount !== undefined ? { retryCount: extra.retryCount } : {}),
      },
    });
    return toJob(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.backgroundJob.delete({ where: { id } });
  }
}
