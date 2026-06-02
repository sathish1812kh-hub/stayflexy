// FILE: src/modules/recommendations/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  RecommendationFilterDto,
  UpdateRecommendationStatusDto,
  GenerateRecommendationsDto,
} from "../dto";
import type {
  RecommendationFilterDtoType,
  UpdateRecommendationStatusDtoType,
  GenerateRecommendationsDtoType,
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

export function validateRecommendationFilter(data: unknown): RecommendationFilterDtoType {
  return wrapZod(() => RecommendationFilterDto.parse(data));
}

export function validateUpdateRecommendationStatus(data: unknown): UpdateRecommendationStatusDtoType {
  return wrapZod(() => UpdateRecommendationStatusDto.parse(data));
}

export function validateGenerateRecommendations(data: unknown): GenerateRecommendationsDtoType {
  return wrapZod(() => GenerateRecommendationsDto.parse(data));
}
