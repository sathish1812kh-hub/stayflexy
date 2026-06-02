// FILE: src/modules/synchronization/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateSyncJobDto,
  SyncJobFilterDto,
  RetrySyncJobDto,
  SyncEventFilterDto,
  type CreateSyncJobDtoType,
  type SyncJobFilterDtoType,
  type RetrySyncJobDtoType,
  type SyncEventFilterDtoType,
} from "../dto";

function parseOrThrow<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

export function validateCreateSyncJob(data: unknown): CreateSyncJobDtoType {
  return parseOrThrow(CreateSyncJobDto, data);
}

export function validateSyncJobFilter(data: unknown): SyncJobFilterDtoType {
  return parseOrThrow(SyncJobFilterDto, data);
}

export function validateRetrySyncJob(data: unknown): RetrySyncJobDtoType {
  return parseOrThrow(RetrySyncJobDto, data);
}

export function validateSyncEventFilter(data: unknown): SyncEventFilterDtoType {
  return parseOrThrow(SyncEventFilterDto, data);
}
