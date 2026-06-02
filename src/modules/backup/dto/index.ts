import { z } from "zod";

const BackupTypeEnum = z.enum(["DATABASE", "REDIS_SNAPSHOT", "QUEUE_STATE", "FULL"]);
const BackupStatusEnum = z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED", "VERIFIED", "CORRUPTED"]);

export const CreateBackupDto = z.object({
  backupType: BackupTypeEnum,
  storageLocation: z.string().min(1).max(500),
  retentionUntil: z.coerce.date(),
});
export type CreateBackupDtoType = z.infer<typeof CreateBackupDto>;

export const BackupFilterDto = z.object({
  backupType: BackupTypeEnum.optional(),
  backupStatus: BackupStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type BackupFilterDtoType = z.infer<typeof BackupFilterDto>;
