export const JOB_ERRORS = {
  NOT_FOUND: "Background job not found",
  IDEMPOTENCY_CONFLICT: "A job with this idempotency key already exists",
  ALREADY_RUNNING: "Job is already running",
  ALREADY_COMPLETED: "Job has already completed",
} as const;

export const JOB_TYPES = {
  REVENUE_CALCULATION: "REVENUE_CALCULATION",
  INVENTORY_SYNC: "INVENTORY_SYNC",
  NOTIFICATION_SEND: "NOTIFICATION_SEND",
  REPORT_GENERATION: "REPORT_GENERATION",
  AUDIT_CLEANUP: "AUDIT_CLEANUP",
  OTA_SYNC: "OTA_SYNC",
} as const;

export const MAX_DEAD_LETTER_RETRIES = 5;
