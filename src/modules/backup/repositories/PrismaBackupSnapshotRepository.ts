import { Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { PaginatedResult, PaginationParams } from "@shared-types";
import type { BackupSnapshot, CreateBackupSnapshotData, BackupFilter, BackupStatusType, BackupTypeType } from "../types";

type PrismaSnap = Prisma.BackupSnapshotGetPayload<Record<string, never>>;

function toSnapshot(r: PrismaSnap): BackupSnapshot {
  return {
    id: r.id,
    backupType: r.backupType as BackupTypeType,
    backupStatus: r.backupStatus as BackupStatusType,
    storageLocation: r.storageLocation,
    sizeBytes: r.sizeBytes,
    checksum: r.checksum,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    retentionUntil: r.retentionUntil,
    metadata: r.metadata != null ? (r.metadata as Record<string, unknown>) : null,
    createdAt: r.createdAt,
  };
}

export class PrismaBackupSnapshotRepository extends BaseRepository<
  BackupSnapshot,
  CreateBackupSnapshotData,
  { backupStatus?: BackupStatusType; sizeBytes?: bigint; checksum?: string; completedAt?: Date }
> {
  async findById(id: string): Promise<BackupSnapshot | null> {
    const r = await this.db.backupSnapshot.findFirst({ where: { id } });
    return r ? toSnapshot(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<BackupSnapshot>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.backupSnapshot.findMany({ skip, take: params.limit, orderBy: { startedAt: "desc" } }),
      this.db.backupSnapshot.count(),
    ]);
    return { data: records.map(toSnapshot), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: BackupFilter): Promise<PaginatedResult<BackupSnapshot>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.BackupSnapshotWhereInput = {
      ...(filter.backupType && { backupType: filter.backupType as PrismaSnap["backupType"] }),
      ...(filter.backupStatus && { backupStatus: filter.backupStatus as PrismaSnap["backupStatus"] }),
    };

    const [records, total] = await Promise.all([
      this.db.backupSnapshot.findMany({ where, skip, take: limit, orderBy: { startedAt: "desc" } }),
      this.db.backupSnapshot.count({ where }),
    ]);
    return { data: records.map(toSnapshot), meta: this.buildPaginationMeta(total, params) };
  }

  async findActiveByType(backupType: BackupTypeType): Promise<BackupSnapshot | null> {
    const r = await this.db.backupSnapshot.findFirst({
      where: { backupType: backupType as PrismaSnap["backupType"], backupStatus: "RUNNING" },
    });
    return r ? toSnapshot(r) : null;
  }

  async findExpired(): Promise<BackupSnapshot[]> {
    const records = await this.db.backupSnapshot.findMany({
      where: { retentionUntil: { lt: new Date() }, backupStatus: "COMPLETED" },
    });
    return records.map(toSnapshot);
  }

  async create(data: CreateBackupSnapshotData): Promise<BackupSnapshot> {
    const r = await this.db.backupSnapshot.create({
      data: {
        backupType: data.backupType as PrismaSnap["backupType"],
        backupStatus: "PENDING",
        storageLocation: data.storageLocation,
        retentionUntil: data.retentionUntil,
        metadata: data.metadata != null ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
    return toSnapshot(r);
  }

  async update(
    id: string,
    data: { backupStatus?: BackupStatusType; sizeBytes?: bigint; checksum?: string; completedAt?: Date }
  ): Promise<BackupSnapshot> {
    const payload: Prisma.BackupSnapshotUpdateInput = {};
    if (data.backupStatus) payload.backupStatus = data.backupStatus as PrismaSnap["backupStatus"];
    if (data.sizeBytes !== undefined) payload.sizeBytes = data.sizeBytes;
    if (data.checksum !== undefined) payload.checksum = data.checksum;
    if (data.completedAt !== undefined) payload.completedAt = data.completedAt;
    const r = await this.db.backupSnapshot.update({ where: { id }, data: payload });
    return toSnapshot(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.backupSnapshot.delete({ where: { id } });
  }
}
