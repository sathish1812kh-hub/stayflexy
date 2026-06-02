export type RecoveryTypeType = "DATABASE_RESTORE" | "CACHE_WARMUP" | "QUEUE_REPLAY" | "FULL_RECOVERY";
export type RecoveryStatusType = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface RecoveryExecutionLog {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

export interface RecoveryExecution {
  id: string;
  recoveryType: RecoveryTypeType;
  recoveryStatus: RecoveryStatusType;
  backupSnapshotId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  executionLogs: RecoveryExecutionLog[] | null;
  metadata: Record<string, unknown> | null;
  initiatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecoveryExecutionData {
  recoveryType: RecoveryTypeType;
  backupSnapshotId?: string;
  metadata?: Record<string, unknown>;
  initiatedBy?: string;
}

export interface RecoveryFilter {
  recoveryType?: RecoveryTypeType;
  recoveryStatus?: RecoveryStatusType;
  page?: number;
  limit?: number;
}
