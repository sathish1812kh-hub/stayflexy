// FILE: src/modules/pricing/types/index.ts

// ─── String union aliases ─────────────────────────────────────────────────────

export type PricingStrategyType =
  | "FLAT_RATE"
  | "PERCENTAGE_ADJUSTMENT"
  | "OCCUPANCY_BASED"
  | "SEASONAL"
  | "WEEKEND"
  | "DEMAND_BASED"
  | "SPECIAL_EVENT";

export type AdjustmentTypeType = "INCREASE" | "DECREASE" | "FIXED";

export type PricingRuleStatusType = "ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED";

// ─── Domain models ────────────────────────────────────────────────────────────

export interface PricingRule {
  id: string;
  organizationId: string;
  hotelId: string;
  roomTypeId: string | null;
  ruleName: string;
  pricingStrategy: PricingStrategyType;
  adjustmentType: AdjustmentTypeType;
  adjustmentValue: number;
  minimumPrice: number | null;
  maximumPrice: number | null;
  applicableDays: string[];
  applicableSeasons: string[];
  activeFrom: Date;
  activeTo: Date | null;
  priority: number;
  status: PricingRuleStatusType;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DynamicRate {
  id: string;
  organizationId: string;
  hotelId: string;
  roomTypeId: string;
  inventoryDate: Date;
  calculatedRate: number;
  baseRate: number;
  appliedRuleId: string | null;
  occupancyFactor: number;
  demandFactor: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Create / Update input types ──────────────────────────────────────────────

export interface CreatePricingRuleData {
  organizationId: string;
  hotelId: string;
  roomTypeId?: string;
  ruleName: string;
  pricingStrategy: PricingStrategyType;
  adjustmentType: AdjustmentTypeType;
  adjustmentValue: number;
  minimumPrice?: number;
  maximumPrice?: number;
  applicableDays: string[];
  applicableSeasons: string[];
  activeFrom: Date;
  activeTo?: Date;
  priority?: number;
  createdById: string;
}

export type UpdatePricingRuleData = Partial<{
  ruleName: string;
  adjustmentType: AdjustmentTypeType;
  adjustmentValue: number;
  minimumPrice: number;
  maximumPrice: number;
  applicableDays: string[];
  applicableSeasons: string[];
  activeFrom: Date;
  activeTo: Date;
  priority: number;
  status: PricingRuleStatusType;
}>;

export interface CreateDynamicRateData {
  organizationId: string;
  hotelId: string;
  roomTypeId: string;
  inventoryDate: Date;
  calculatedRate: number;
  baseRate: number;
  appliedRuleId?: string;
  occupancyFactor?: number;
  demandFactor?: number;
}

export type UpdateDynamicRateData = Partial<{
  calculatedRate: number;
  appliedRuleId: string;
  occupancyFactor: number;
  demandFactor: number;
}>;

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface PricingRuleFilter {
  organizationId?: string;
  hotelId?: string;
  roomTypeId?: string;
  status?: PricingRuleStatusType;
  pricingStrategy?: PricingStrategyType;
  page?: number;
  limit?: number;
}

// ─── Rate calculation types ───────────────────────────────────────────────────

export interface RateCalculationInput {
  roomTypeId: string;
  hotelId: string;
  date: Date;
  baseRate: number;
  occupancyRate: number;
}

export interface RateCalculationResult {
  roomTypeId: string;
  date: Date;
  baseRate: number;
  calculatedRate: number;
  appliedRuleId: string | null;
  appliedRuleName: string | null;
  occupancyFactor: number;
  demandFactor: number;
  adjustments: Array<{
    ruleName: string;
    strategy: string;
    adjustedRate: number;
  }>;
}
