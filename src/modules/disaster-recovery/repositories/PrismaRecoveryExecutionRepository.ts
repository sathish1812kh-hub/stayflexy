import { Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type {
  RecoveryExecution,
  CreateRecoveryExecutionData,
  RecoveryFilter,
  RecoveryTypeType,
  RecoveryStatusType,
  RecoveryExecutionLog,
} from "../types";

type PrismaExec = Prisma.RecoveryExecutionGetPayload<Record<string, never>>;

function toExecution(r: PrismaExec): RecoveryExecution {
  return {
    id: r.id,
    recoveryType: r.recoveryType as RecoveryTypeType,
    recoveryStatus: r.recoveryStatus as RecoveryStatusType,
    backupSnapshotId: r.backupSnapshotId,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    executionLogs: r.executionLogs != null
      ? (r.executionLogs as unknown as RecoveryExecutionLog[])
      : null,
    metadata: r.metadata != null ? (r.metadata as Record<string, unknown>) : null,
    initiatedBy: r.initiatedBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaRecoveryExecutionRepository extends BaseRepository<
  RecoveryExecution,
  CreateRecoveryExecutionData,
  { recoveryStatus?: RecoveryStatusType; completedAt?: Date; executionLogs?: RecoveryExecutionLog[] }
> {
  async findById(id: string): Promise<RecoveryExecution | null> {
    const r = await this.db.recoveryExecution.findFirst({ where: { id } });
    return r ? toExecution(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<RecoveryExecution>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.recoveryExecution.findMany({ skip, take: params.limit, orderBy: { startedAt: "desc" } }),
      this.db.recoveryExecution.count(),
    ]);
    return { data: records.map(toExecution), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: RecoveryFilter): Promise<PaginatedResult<RecoveryExecution>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.RecoveryExecutionWhereInput = {
      ...(filter.recoveryType && { recoveryType: filter.recoveryType as PrismaExec["recoveryType"] }),
      ...(filter.recoveryStatus && { recoveryStatus: filter.recoveryStatus as PrismaExec["recoveryStatus"] }),
    };

    const [records, total] = await Promise.all([
      this.db.recoveryExecution.findMany({ where, skip, take: limit, orderBy: { startedAt: "desc" } }),
      this.db.recoveryExecution.count({ where }),
    ]);
    return { data: records.map(toExecution), meta: this.buildPaginationMeta(total, params) };
  }

  async findActiveByType(recoveryType: RecoveryTypeType): Promise<RecoveryExecution | null> {
    const r = await this.db.recoveryExecution.findFirst({
      where: { recoveryType: recoveryType as PrismaExec["recoveryType"], recoveryStatus: "RUNNING" },
    });
    return r ? toExecution(r) : null;
  }

  async create(data: CreateRecoveryExecutionData): Promise<RecoveryExecution> {
    const r = await this.db.recoveryExecution.create({
      data: {
        recoveryType: data.recoveryType as PrismaExec["recoveryType"],
        recoveryStatus: "PENDING",
        backupSnapshotId: data.backupSnapshotId ?? null,
        metadata: data.metadata != null ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        executionLogs: Prisma.JsonNull as unknown as Prisma.InputJsonValue,
        initiatedBy: data.initiatedBy ?? null,
      },
    });
    return toExecution(r);
  }

  async update(
    id: string,
    data: { recoveryStatus?: RecoveryStatusType; completedAt?: Date; executionLogs?: RecoveryExecutionLog[] }
  ): Promise<RecoveryExecution> {
    const payload: Prisma.RecoveryExecutionUpdateInput = {};
    if (data.recoveryStatus) payload.recoveryStatus = data.recoveryStatus as PrismaExec["recoveryStatus"];
    if (data.completedAt !== undefined) payload.completedAt = data.completedAt;
    if (data.executionLogs !== undefined)
      payload.executionLogs = data.executionLogs as unknown as Prisma.InputJsonValue;
    const r = await this.db.recoveryExecution.update({ where: { id }, data: payload });
    return toExecution(r);
  }

  async appendLog(id: string, entry: RecoveryExecutionLog): Promise<void> {
    const existing = await this.db.recoveryExecution.findFirst({ where: { id }, select: { executionLogs: true } });
    const logs: RecoveryExecutionLog[] = existing?.executionLogs != null
      ? (existing.executionLogs as unknown as RecoveryExecutionLog[])
      : [];
    logs.push(entry);
    await this.db.recoveryExecution.update({ where: { id }, data: { executionLogs: logs as unknown as Prisma.InputJsonValue } });
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.recoveryExecution.delete({ where: { id } });
  }
}
