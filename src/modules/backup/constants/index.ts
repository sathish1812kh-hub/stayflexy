export const BACKUP_ERRORS = {
  SNAPSHOT_NOT_FOUND: "Backup snapshot not found",
  BACKUP_IN_PROGRESS: "A backup of this type is already in progress",
} as const;

export const BACKUP_RETENTION_DAYS = {
  DATABASE: 30,
  REDIS_SNAPSHOT: 7,
  QUEUE_STATE: 3,
  FULL: 30,
} as const;
