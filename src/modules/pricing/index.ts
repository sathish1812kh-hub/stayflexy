// FILE: src/modules/pricing/index.ts

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  PricingRule,
  DynamicRate,
  CreatePricingRuleData,
  UpdatePricingRuleData,
  CreateDynamicRateData,
  UpdateDynamicRateData,
  PricingRuleFilter,
  PricingRuleStatusType,
  PricingStrategyType,
  AdjustmentTypeType,
  RateCalculationInput,
  RateCalculationResult,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  PRICING_ERRORS,
  DAY_NAMES,
  WEEKEND_DAYS,
  WEEKDAY_DAYS,
  DEFAULT_OCCUPANCY_THRESHOLDS,
  DEFAULT_OCCUPANCY_MULTIPLIERS,
} from "./constants";
export type { DayName } from "./constants";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export {
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
  PricingRuleFilterDto,
  CalculateRateDto,
} from "./dto";
export type {
  CreatePricingRuleDtoType,
  UpdatePricingRuleDtoType,
  PricingRuleFilterDtoType,
  CalculateRateDtoType,
} from "./dto";

// ─── Validators ───────────────────────────────────────────────────────────────
export {
  validateCreatePricingRule,
  validateUpdatePricingRule,
  validatePricingRuleFilter,
  validateCalculateRate,
} from "./validators";

// ─── Repositories ─────────────────────────────────────────────────────────────
export { PrismaPricingRuleRepository, PrismaDynamicRateRepository } from "./repositories";

// ─── Calculators ──────────────────────────────────────────────────────────────
export { PricingCalculator } from "./calculators";

// ─── Services ─────────────────────────────────────────────────────────────────
export { PricingRuleService, DynamicRateService } from "./services";

// ─── Container ────────────────────────────────────────────────────────────────
export { pricingRuleService, dynamicRateService } from "./container";
