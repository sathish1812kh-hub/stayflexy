// FILE: src/modules/revenue/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  RevenueMetricFilterDto,
  OccupancyQueryDto,
  ForecastQueryDto,
  type RevenueMetricFilterDtoType,
  type OccupancyQueryDtoType,
  type ForecastQueryDtoType,
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

export function validateRevenueMetricFilter(data: unknown): RevenueMetricFilterDtoType {
  return wrapZod(() => RevenueMetricFilterDto.parse(data)) as RevenueMetricFilterDtoType;
}

export function validateOccupancyQuery(data: unknown): OccupancyQueryDtoType {
  return wrapZod(() => OccupancyQueryDto.parse(data)) as OccupancyQueryDtoType;
}

export function validateForecastQuery(data: unknown): ForecastQueryDtoType {
  return wrapZod(() => ForecastQueryDto.parse(data)) as ForecastQueryDtoType;
}
