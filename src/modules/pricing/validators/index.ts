// FILE: src/modules/pricing/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
  PricingRuleFilterDto,
  CalculateRateDto,
  type CreatePricingRuleDtoType,
  type UpdatePricingRuleDtoType,
  type PricingRuleFilterDtoType,
  type CalculateRateDtoType,
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

export function validateCreatePricingRule(data: unknown): CreatePricingRuleDtoType {
  return wrapZod(() => CreatePricingRuleDto.parse(data)) as CreatePricingRuleDtoType;
}

export function validateUpdatePricingRule(data: unknown): UpdatePricingRuleDtoType {
  return wrapZod(() => UpdatePricingRuleDto.parse(data)) as UpdatePricingRuleDtoType;
}

export function validatePricingRuleFilter(data: unknown): PricingRuleFilterDtoType {
  return wrapZod(() => PricingRuleFilterDto.parse(data)) as PricingRuleFilterDtoType;
}

export function validateCalculateRate(data: unknown): CalculateRateDtoType {
  return wrapZod(() => CalculateRateDto.parse(data)) as CalculateRateDtoType;
}
