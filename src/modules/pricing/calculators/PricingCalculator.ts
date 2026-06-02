// FILE: src/modules/pricing/calculators/PricingCalculator.ts
import type { PricingRule, RateCalculationResult, RateCalculationInput } from "../types";
import {
  DEFAULT_OCCUPANCY_THRESHOLDS,
  DEFAULT_OCCUPANCY_MULTIPLIERS,
  type DayName,
} from "../constants";

export class PricingCalculator {
  // Returns occupancy factor (multiplier) based on current occupancy %.
  static getOccupancyFactor(occupancyRate: number): number {
    if (occupancyRate < DEFAULT_OCCUPANCY_THRESHOLDS.LOW) return DEFAULT_OCCUPANCY_MULTIPLIERS.LOW;
    if (occupancyRate < DEFAULT_OCCUPANCY_THRESHOLDS.MEDIUM) return DEFAULT_OCCUPANCY_MULTIPLIERS.MEDIUM;
    if (occupancyRate < DEFAULT_OCCUPANCY_THRESHOLDS.HIGH) return DEFAULT_OCCUPANCY_MULTIPLIERS.HIGH;
    return DEFAULT_OCCUPANCY_MULTIPLIERS.PEAK;
  }

  // Returns true if the given date matches the rule's applicableDays filter.
  static matchesDay(rule: PricingRule, date: Date): boolean {
    if (rule.applicableDays.length === 0) return true; // no day restriction
    const dayMap: DayName[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const dayName = dayMap[date.getUTCDay()];
    if (dayName === undefined) return false;
    return rule.applicableDays.includes(dayName);
  }

  // Returns true if the date falls within the rule's activeFrom/activeTo window.
  static matchesDateRange(rule: PricingRule, date: Date): boolean {
    const d = date.getTime();
    const from = new Date(rule.activeFrom).setUTCHours(0, 0, 0, 0);
    if (d < from) return false;
    if (rule.activeTo) {
      const to = new Date(rule.activeTo).setUTCHours(23, 59, 59, 999);
      if (d > to) return false;
    }
    return true;
  }

  // Applies a single rule's adjustment to a base rate. Returns the adjusted rate.
  static applyRule(baseRate: number, rule: PricingRule, occupancyRate: number): number {
    let adjusted = baseRate;

    switch (rule.pricingStrategy) {
      case "FLAT_RATE":
        adjusted = rule.adjustmentValue;
        break;
      case "PERCENTAGE_ADJUSTMENT": {
        const pct = rule.adjustmentValue / 100;
        adjusted =
          rule.adjustmentType === "DECREASE"
            ? baseRate * (1 - pct)
            : baseRate * (1 + pct);
        break;
      }
      case "OCCUPANCY_BASED": {
        const factor = PricingCalculator.getOccupancyFactor(occupancyRate);
        adjusted = baseRate * factor;
        break;
      }
      case "WEEKEND": {
        const pct = rule.adjustmentValue / 100;
        adjusted =
          rule.adjustmentType === "DECREASE"
            ? baseRate * (1 - pct)
            : baseRate * (1 + pct);
        break;
      }
      case "SEASONAL":
      case "DEMAND_BASED":
      case "SPECIAL_EVENT": {
        if (rule.adjustmentType === "FIXED") {
          adjusted = rule.adjustmentValue;
        } else {
          const pct = rule.adjustmentValue / 100;
          adjusted =
            rule.adjustmentType === "DECREASE"
              ? baseRate * (1 - pct)
              : baseRate * (1 + pct);
        }
        break;
      }
    }

    // Enforce min/max bounds
    if (rule.minimumPrice !== null && rule.minimumPrice !== undefined && adjusted < rule.minimumPrice) {
      adjusted = rule.minimumPrice;
    }
    if (rule.maximumPrice !== null && rule.maximumPrice !== undefined && adjusted > rule.maximumPrice) {
      adjusted = rule.maximumPrice;
    }

    return Math.round(adjusted * 100) / 100;
  }

  // Applies all matching active rules (highest priority first) to produce a final rate.
  // Rules are applied sequentially: each rule adjusts the rate from the previous step.
  static calculateRate(input: RateCalculationInput, rules: PricingRule[]): RateCalculationResult {
    const occupancyFactor = PricingCalculator.getOccupancyFactor(input.occupancyRate);

    // Filter rules applicable to this specific date
    const applicableRules = rules.filter(
      (r) =>
        r.status === "ACTIVE" &&
        PricingCalculator.matchesDay(r, input.date) &&
        PricingCalculator.matchesDateRange(r, input.date)
    );

    // Sort by priority descending (highest first)
    applicableRules.sort((a, b) => b.priority - a.priority);

    let currentRate = input.baseRate;
    const adjustments: RateCalculationResult["adjustments"] = [];
    let appliedRuleId: string | null = null;
    let appliedRuleName: string | null = null;

    for (const rule of applicableRules) {
      const rateAfter = PricingCalculator.applyRule(currentRate, rule, input.occupancyRate);
      adjustments.push({ ruleName: rule.ruleName, strategy: rule.pricingStrategy, adjustedRate: rateAfter });
      currentRate = rateAfter;
      // Track the highest-priority applied rule as the "primary" rule
      if (appliedRuleId === null) {
        appliedRuleId = rule.id;
        appliedRuleName = rule.ruleName;
      }
    }

    return {
      roomTypeId: input.roomTypeId,
      date: input.date,
      baseRate: input.baseRate,
      calculatedRate: Math.max(currentRate, 0),
      appliedRuleId,
      appliedRuleName,
      occupancyFactor,
      demandFactor: 1.0,
      adjustments,
    };
  }
}
