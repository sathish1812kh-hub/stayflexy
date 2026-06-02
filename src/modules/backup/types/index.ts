export type BackupTypeType = "DATABASE" | "REDIS_SNAPSHOT" | "QUEUE_STATE" | "FULL";
export type BackupStatusType = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "VERIFIED" | "CORRUPTED";

export interface BackupSnapshot {
  id: string;
  backupType: BackupTypeType;
  backupStatus: BackupStatusType;
  storageLocation: string;
  sizeBytes: bigint | null;
  checksum: string | null;
  startedAt: Date;
  completedAt: Date | null;
  retentionUntil: Date;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateBackupSnapshotData {
  backupType: BackupTypeType;
  storageLocation: string;
  retentionUntil: Date;
  metadata?: Record<string, unknown>;
}

export interface BackupFilter {
  backupType?: BackupTypeType;
  backupStatus?: BackupStatusType;
  page?: number;
  limit?: number;
}
