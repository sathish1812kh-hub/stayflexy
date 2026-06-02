// FILE: src/modules/synchronization/dto/index.ts
import { z } from "zod";

// ─── Enum helpers ─────────────────────────────────────────────────────────────

const SyncTypeEnum = z.enum([
  "INVENTORY_PUSH",
  "RATE_PUSH",
  "RESERVATION_PULL",
  "RESERVATION_IMPORT",
  "RECONCILIATION",
  "FULL_SYNC",
]);

const SyncStatusEnum = z.enum([
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
  "RETRYING",
]);

const SyncEventTypeEnum = z.enum([
  "SYNC_STARTED",
  "SYNC_COMPLETED",
  "SYNC_FAILED",
  "RETRY_INITIATED",
  "INVENTORY_UPDATED",
  "RATE_UPDATED",
  "RESERVATION_RECEIVED",
  "RESERVATION_IMPORTED",
  "MAPPING_VALIDATED",
  "RECONCILIATION_COMPLETE",
]);

// ─── CreateSyncJobDto ─────────────────────────────────────────────────────────

export const CreateSyncJobDto = z.object({
  hotelId: z.string().uuid("hotelId must be a valid UUID"),
  providerId: z.string().uuid("providerId must be a valid UUID"),
  syncType: SyncTypeEnum,
  payload: z.record(z.string(), z.unknown()).optional(),
  maxRetries: z.number().int().min(1).max(10).default(3).optional(),
});

export type CreateSyncJobDtoType = z.infer<typeof CreateSyncJobDto>;

// ─── SyncJobFilterDto ─────────────────────────────────────────────────────────

export const SyncJobFilterDto = z.object({
  hotelId: z.string().uuid("hotelId must be a valid UUID").optional(),
  providerId: z.string().uuid("providerId must be a valid UUID").optional(),
  syncType: SyncTypeEnum.optional(),
  syncStatus: SyncStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type SyncJobFilterDtoType = z.infer<typeof SyncJobFilterDto>;

// ─── RetrySyncJobDto ──────────────────────────────────────────────────────────

export const RetrySyncJobDto = z.object({});

export type RetrySyncJobDtoType = z.infer<typeof RetrySyncJobDto>;

// ─── SyncEventFilterDto ───────────────────────────────────────────────────────

export const SyncEventFilterDto = z.object({
  syncJobId: z.string().uuid("syncJobId must be a valid UUID").optional(),
  eventType: SyncEventTypeEnum.optional(),
  processingStatus: SyncStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type SyncEventFilterDtoType = z.infer<typeof SyncEventFilterDto>;
