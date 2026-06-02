// FILE: src/modules/intelligence/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import { InsightFilterDto, AnomalyFilterDto, GenerateInsightsDto } from "../dto";
import type { InsightFilterDtoType, AnomalyFilterDtoType, GenerateInsightsDtoType } from "../dto";

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

export function validateInsightFilter(data: unknown): InsightFilterDtoType {
  return wrapZod(() => InsightFilterDto.parse(data));
}

export function validateAnomalyFilter(data: unknown): AnomalyFilterDtoType {
  return wrapZod(() => AnomalyFilterDto.parse(data));
}

export function validateGenerateInsights(data: unknown): GenerateInsightsDtoType {
  return wrapZod(() => GenerateInsightsDto.parse(data));
}
