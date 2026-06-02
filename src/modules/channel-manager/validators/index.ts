import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  TriggerSyncDto,
  SyncStatusQueryDto,
  type TriggerSyncDtoType,
  type SyncStatusQueryDtoType,
} from "../dto";

function wrapZod<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({ field: e.path.join("."), message: e.message }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

export function validateTriggerSync(data: unknown): TriggerSyncDtoType {
  return wrapZod(() => TriggerSyncDto.parse(data)) as TriggerSyncDtoType;
}

export function validateSyncStatusQuery(data: unknown): SyncStatusQueryDtoType {
  return wrapZod(() => SyncStatusQueryDto.parse(data)) as SyncStatusQueryDtoType;
}
