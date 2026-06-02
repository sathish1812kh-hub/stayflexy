import { z } from "zod";

const SyncTypeEnum = z.enum([
  "INVENTORY_PUSH",
  "RATE_PUSH",
  "RESERVATION_PULL",
  "RESERVATION_IMPORT",
  "RECONCILIATION",
  "FULL_SYNC",
]);

export const TriggerSyncDto = z.object({
  hotelId: z.string().uuid(),
  providerId: z.string().uuid(),
  syncType: SyncTypeEnum,
  payload: z.record(z.unknown()).optional(),
  maxRetries: z.number().int().min(1).max(10).optional(),
});
export type TriggerSyncDtoType = z.infer<typeof TriggerSyncDto>;

export const SyncStatusQueryDto = z.object({
  hotelId: z.string().uuid(),
  providerId: z.string().uuid().optional(),
});
export type SyncStatusQueryDtoType = z.infer<typeof SyncStatusQueryDto>;
