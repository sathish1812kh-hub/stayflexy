import { BaseService } from "@lib/baseService";
import { NotFoundError, ConflictError } from "@errors/HttpError";
import type { PaginatedResult } from "@shared-types";
import type { PrismaBackupSnapshotRepository } from "../repositories/PrismaBackupSnapshotRepository";
import type { BackupSnapshot } from "../types";
import type { CreateBackupDtoType, BackupFilterDtoType } from "../dto";
import { BACKUP_ERRORS, BACKUP_RETENTION_DAYS } from "../constants";

export class BackupService extends BaseService {
  protected readonly moduleName = "BackupService";

  constructor(private readonly repo: PrismaBackupSnapshotRepository) {
    super();
  }

  async initiateBackup(dto: CreateBackupDtoType): Promise<BackupSnapshot> {
    return this.execute("initiateBackup", async () => {
      const active = await this.repo.findActiveByType(dto.backupType);
      if (active) throw new ConflictError(BACKUP_ERRORS.BACKUP_IN_PROGRESS);

      const snapshot = await this.repo.create({
        backupType: dto.backupType,
        storageLocation: dto.storageLocation,
        retentionUntil: dto.retentionUntil,
      });

      const started = await this.repo.update(snapshot.id, { backupStatus: "RUNNING" });
      this.getLogger().info("Backup initiated", { snapshotId: snapshot.id, type: dto.backupType });
      return started;
    });
  }

  async completeBackup(
    id: string,
    sizeBytes: bigint,
    checksum: string
  ): Promise<BackupSnapshot> {
    return this.execute("completeBackup", async () => {
      await this.requireExists(id);
      const snap = await this.repo.update(id, {
        backupStatus: "COMPLETED",
        sizeBytes,
        checksum,
        completedAt: new Date(),
      });
      this.getLogger().info("Backup completed", { snapshotId: id, sizeBytes: sizeBytes.toString() });
      return snap;
    });
  }

  async failBackup(id: string): Promise<BackupSnapshot> {
    return this.execute("failBackup", async () => {
      await this.requireExists(id);
      return this.repo.update(id, { backupStatus: "FAILED" });
    });
  }

  async verifyBackup(id: string): Promise<BackupSnapshot> {
    return this.execute("verifyBackup", async () => {
      await this.requireExists(id);
      return this.repo.update(id, { backupStatus: "VERIFIED" });
    });
  }

  async getSnapshot(id: string): Promise<BackupSnapshot> {
    return this.execute("getSnapshot", async () => {
      return this.requireExists(id);
    });
  }

  async listSnapshots(filter: BackupFilterDtoType): Promise<PaginatedResult<BackupSnapshot>> {
    return this.execute("listSnapshots", async () => {
      return this.repo.findManyFiltered({
        backupType: filter.backupType,
        backupStatus: filter.backupStatus,
        page: filter.page,
        limit: filter.limit,
      });
    });
  }

  async purgeExpired(): Promise<number> {
    return this.execute("purgeExpired", async () => {
      const expired = await this.repo.findExpired();
      await Promise.all(expired.map((s) => this.repo.hardDelete(s.id)));
      this.getLogger().info("Purged expired backup snapshots", { count: expired.length });
      return expired.length;
    });
  }

  getRetentionDays() {
    return BACKUP_RETENTION_DAYS;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async requireExists(id: string): Promise<BackupSnapshot> {
    const snap = await this.repo.findById(id);
    if (!snap) throw new NotFoundError(BACKUP_ERRORS.SNAPSHOT_NOT_FOUND);
    return snap;
  }
}
