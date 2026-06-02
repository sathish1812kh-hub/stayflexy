// FILE: src/modules/pricing/dto/index.ts
import { z } from "zod";

// ─── Enum helpers ─────────────────────────────────────────────────────────────

const PricingStrategyEnum = z.enum([
  "FLAT_RATE",
  "PERCENTAGE_ADJUSTMENT",
  "OCCUPANCY_BASED",
  "SEASONAL",
  "WEEKEND",
  "DEMAND_BASED",
  "SPECIAL_EVENT",
]);

const AdjustmentTypeEnum = z.enum(["INCREASE", "DECREASE", "FIXED"]);

const PricingRuleStatusEnum = z.enum(["ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED"]);

const DayNameEnum = z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);

// ─── Date string helper ───────────────────────────────────────────────────────

const dateStringSchema = z.string().refine(
  (val) => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  },
  { message: "Invalid date format" }
);

// ─── CreatePricingRuleDto ─────────────────────────────────────────────────────

export const CreatePricingRuleDto = z
  .object({
    hotelId: z.string().uuid("Invalid hotel ID"),
    roomTypeId: z.string().uuid("Invalid room type ID").optional(),
    ruleName: z.string().min(2, "Rule name must be at least 2 characters").max(200, "Rule name must be at most 200 characters"),
    pricingStrategy: PricingStrategyEnum,
    adjustmentType: AdjustmentTypeEnum,
    adjustmentValue: z.number().positive("Adjustment value must be positive"),
    minimumPrice: z.number().positive("Minimum price must be positive").optional(),
    maximumPrice: z.number().positive("Maximum price must be positive").optional(),
    applicableDays: z.array(DayNameEnum).default([]),
    applicableSeasons: z.array(z.string()).default([]),
    activeFrom: dateStringSchema,
    activeTo: dateStringSchema.optional(),
    priority: z.number().int("Priority must be an integer").default(0),
  })
  .refine(
    (data) => {
      if (data.minimumPrice !== undefined && data.maximumPrice !== undefined) {
        return data.minimumPrice <= data.maximumPrice;
      }
      return true;
    },
    {
      message: "Minimum price cannot exceed maximum price",
      path: ["minimumPrice"],
    }
  );

// ─── UpdatePricingRuleDto ─────────────────────────────────────────────────────

export const UpdatePricingRuleDto = z
  .object({
    ruleName: z.string().min(2, "Rule name must be at least 2 characters").max(200, "Rule name must be at most 200 characters").optional(),
    adjustmentType: AdjustmentTypeEnum.optional(),
    adjustmentValue: z.number().positive("Adjustment value must be positive").optional(),
    minimumPrice: z.number().positive("Minimum price must be positive").optional(),
    maximumPrice: z.number().positive("Maximum price must be positive").optional(),
    applicableDays: z.array(DayNameEnum).optional(),
    applicableSeasons: z.array(z.string()).optional(),
    activeFrom: dateStringSchema.optional(),
    activeTo: dateStringSchema.optional(),
    priority: z.number().int("Priority must be an integer").optional(),
    status: PricingRuleStatusEnum.optional(),
  })
  .refine(
    (data) => {
      if (data.minimumPrice !== undefined && data.maximumPrice !== undefined) {
        return data.minimumPrice <= data.maximumPrice;
      }
      return true;
    },
    {
      message: "Minimum price cannot exceed maximum price",
      path: ["minimumPrice"],
    }
  );

// ─── PricingRuleFilterDto ─────────────────────────────────────────────────────

export const PricingRuleFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  roomTypeId: z.string().uuid("Invalid room type ID").optional(),
  status: PricingRuleStatusEnum.optional(),
  pricingStrategy: PricingStrategyEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── CalculateRateDto ─────────────────────────────────────────────────────────

export const CalculateRateDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  roomTypeId: z.string().uuid("Invalid room type ID"),
  date: dateStringSchema,
  baseRate: z.number().positive("Base rate must be positive").optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreatePricingRuleDtoType = z.infer<typeof CreatePricingRuleDto>;
export type UpdatePricingRuleDtoType = z.infer<typeof UpdatePricingRuleDto>;
export type PricingRuleFilterDtoType = z.infer<typeof PricingRuleFilterDto>;
export type CalculateRateDtoType = z.infer<typeof CalculateRateDto>;
