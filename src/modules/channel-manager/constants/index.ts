export const CHANNEL_MANAGER_ERRORS = {
  HOTEL_NOT_FOUND: "Hotel not found or access denied",
  PROVIDER_NOT_FOUND: "OTA provider not found",
  MAPPING_REQUIRED: "No active OTA mapping found — create a mapping before syncing",
  SYNC_CONFLICT: "A sync job is already running for this hotel and provider",
  INVALID_SYNC_TYPE: "Invalid synchronization type",
} as const;

export const SYNC_PRIORITY = {
  RESERVATION_IMPORT: 10,
  RESERVATION_PULL: 9,
  INVENTORY_PUSH: 7,
  RATE_PUSH: 7,
  RECONCILIATION: 5,
  FULL_SYNC: 3,
} as const;
