export const RECOVERY_ERRORS = {
  EXECUTION_NOT_FOUND: "Recovery execution not found",
  RECOVERY_ALREADY_RUNNING: "A recovery of this type is already running",
  INVALID_SNAPSHOT: "The specified backup snapshot does not exist or is not verified",
} as const;

export const RECOVERY_TIMEOUT_MS = {
  DATABASE_RESTORE: 30 * 60 * 1000,  // 30 minutes
  CACHE_WARMUP: 5 * 60 * 1000,       // 5 minutes
  QUEUE_REPLAY: 10 * 60 * 1000,      // 10 minutes
  FULL_RECOVERY: 60 * 60 * 1000,     // 60 minutes
} as const;
