import { z } from "zod";

const RecoveryTypeEnum = z.enum(["DATABASE_RESTORE", "CACHE_WARMUP", "QUEUE_REPLAY", "FULL_RECOVERY"]);
const RecoveryStatusEnum = z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]);

export const InitiateRecoveryDto = z.object({
  recoveryType: RecoveryTypeEnum,
  backupSnapshotId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type InitiateRecoveryDtoType = z.infer<typeof InitiateRecoveryDto>;

export const RecoveryFilterDto = z.object({
  recoveryType: RecoveryTypeEnum.optional(),
  recoveryStatus: RecoveryStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type RecoveryFilterDtoType = z.infer<typeof RecoveryFilterDto>;
