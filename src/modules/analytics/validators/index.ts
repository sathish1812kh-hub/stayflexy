// FILE: src/modules/analytics/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  AnalyticsQueryDto,
  SnapshotFilterDto,
  type AnalyticsQueryDtoType,
  type SnapshotFilterDtoType,
} from "../dto";

function wrapZod<T>(fn: () => T): T {
  try {
    return fn();
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

export function validateAnalyticsQuery(data: unknown): AnalyticsQueryDtoType {
  return wrapZod(() => AnalyticsQueryDto.parse(data)) as AnalyticsQueryDtoType;
}

export function validateSnapshotFilter(data: unknown): SnapshotFilterDtoType {
  return wrapZod(() => SnapshotFilterDto.parse(data)) as SnapshotFilterDtoType;
}
