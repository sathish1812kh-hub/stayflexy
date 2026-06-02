// FILE: src/modules/synchronization/types/index.ts

// ─── Enum string aliases ─────────────────────────────────────────────────────

export type SyncTypeType =
  | "INVENTORY_PUSH"
  | "RATE_PUSH"
  | "RESERVATION_PULL"
  | "RESERVATION_IMPORT"
  | "RECONCILIATION"
  | "FULL_SYNC";

export type SyncStatusType =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "RETRYING";

export type SyncEventTypeType =
  | "SYNC_STARTED"
  | "SYNC_COMPLETED"
  | "SYNC_FAILED"
  | "RETRY_INITIATED"
  | "INVENTORY_UPDATED"
  | "RATE_UPDATED"
  | "RESERVATION_RECEIVED"
  | "RESERVATION_IMPORTED"
  | "MAPPING_VALIDATED"
  | "RECONCILIATION_COMPLETE";

// ─── Domain models ────────────────────────────────────────────────────────────

export interface SyncJob {
  id: string;
  organizationId: string;
  hotelId: string;
  providerId: string;
  syncType: SyncTypeType;
  syncStatus: SyncStatusType;
  idempotencyKey: string;
  startedAt: Date | null;
  completedAt: Date | null;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  payload: Record<string, unknown> | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncEvent {
  id: string;
  syncJobId: string;
  eventType: SyncEventTypeType;
  payload: Record<string, unknown> | null;
  processingStatus: SyncStatusType;
  errorMessage: string | null;
  createdAt: Date;
}

// ─── Create / Update input types ──────────────────────────────────────────────

export interface CreateSyncJobData {
  organizationId: string;
  hotelId: string;
  providerId: string;
  syncType: SyncTypeType;
  idempotencyKey: string;
  createdById: string;
  payload?: Record<string, unknown> | null;
  maxRetries?: number;
}

export type UpdateSyncJobData = Partial<{
  syncStatus: SyncStatusType;
  startedAt: Date;
  completedAt: Date;
  retryCount: number;
  errorMessage: string;
  payload: Record<string, unknown> | null;
}>;

export interface CreateSyncEventData {
  syncJobId: string;
  eventType: SyncEventTypeType;
  payload?: Record<string, unknown> | null;
  processingStatus: SyncStatusType;
  errorMessage?: string | null;
}

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface SyncJobFilter {
  organizationId?: string;
  hotelId?: string;
  providerId?: string;
  syncType?: SyncTypeType;
  syncStatus?: SyncStatusType;
  page?: number;
  limit?: number;
}

export interface SyncEventFilter {
  syncJobId?: string;
  eventType?: SyncEventTypeType;
  processingStatus?: SyncStatusType;
  page?: number;
  limit?: number;
}

// ─── Summary type ─────────────────────────────────────────────────────────────

export interface SyncJobSummary {
  id: string;
  syncType: SyncTypeType;
  syncStatus: SyncStatusType;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  completedAt?: Date | null;
}
