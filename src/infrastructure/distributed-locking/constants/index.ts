export const LOCK_TTL = {
  INVENTORY: 5_000,        // 5s — short, inventory operations are fast
  BOOKING: 30_000,         // 30s — booking creation can take time
  PAYMENT: 15_000,         // 15s
  OTA_SYNC: 300_000,       // 5 minutes — sync jobs
  DEFAULT: 10_000,         // 10s fallback
} as const;

export const LOCK_ERRORS = {
  ACQUISITION_FAILED: "Could not acquire distributed lock — resource is busy",
  NOT_OWNER: "Cannot release lock — not the current owner",
  LOCK_NOT_FOUND: "Lock does not exist or has expired",
} as const;

export const LOCK_PREFIX = "lock";
export const LOCK_RETRY_INTERVAL_MS = 100;
export const LOCK_RETRY_ATTEMPTS = 3;
