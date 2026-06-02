// FILE: src/modules/synchronization/constants/index.ts

export const SYNC_ERRORS = {
  JOB_NOT_FOUND: "Sync job not found",
  JOB_ALREADY_RUNNING: "Sync job is already running",
  JOB_RETRY_LIMIT_EXCEEDED: "Sync job retry limit exceeded",
  IDEMPOTENCY_CONFLICT: "A sync job with this idempotency key already exists",
  HOTEL_INACTIVE: "Hotel is inactive and cannot be synced",
  PROVIDER_INACTIVE: "OTA provider is inactive",
  NO_MAPPING_FOUND: "No active OTA mapping found for this hotel and provider",
  EVENT_NOT_FOUND: "Sync event not found",
} as const;

export const MAX_RETRY_COUNT = 3;
export const SYNC_LOCK_TTL_SECONDS = 300; // 5 min lock TTL for distributed lock preparation
export const RETRY_BACKOFF_BASE_MS = 1000; // exponential backoff base
export const DEAD_LETTER_THRESHOLD = 5; // jobs exceeding this retry count go to dead-letter
