import type { PricingRule } from '../domain/entities/PricingRule'

export interface PricingInput {
  baseRate: number
  currentOccupancy: number         // 0.0–1.0
  targetDate: Date
  activeRules: PricingRule[]
  demandFactor?: number            // from forecast, default 1.0
  maxSurgeMultiplier?: number      // cap, default 3.0
}

export interface ComputedRate {
  calculatedRate: number
  baseRate: number
  occupancyFactor: number
  demandFactor: number
  appliedRuleId: string | null
  effectiveMultiplier: number
  breakdown: {
    ruleAdjustment: number
    occupancyAdjustment: number
    demandAdjustment: number
    floorApplied: boolean
    ceilingApplied: boolean
  }
}

export class PricingCalculator {
  private readonly OCCUPANCY_TIERS: [number, number][] = [
    [0.95, 1.60],
    [0.85, 1.40],
    [0.70, 1.25],
    [0.40, 1.10],
    [0.00, 1.00],
  ]

  compute(input: PricingInput): ComputedRate {
    const maxMultiplier = input.maxSurgeMultiplier ?? 3.0
    const demandFactor = input.demandFactor ?? 1.0

    // 1. Find highest-priority applicable rule
    const applicableRule = this.findApplicableRule(input.activeRules, input.targetDate)

    // 2. Apply rule adjustment to base rate
    let ruleAdjustedRate = input.baseRate
    if (applicableRule) {
      ruleAdjustedRate = this.applyRuleAdjustment(input.baseRate, applicableRule)
    }

    // 3. Apply occupancy-based multiplier
    const occupancyFactor = this.getOccupancyMultiplier(input.currentOccupancy)
    const occupancyAdjustedRate = ruleAdjustedRate * occupancyFactor

    // 4. Apply demand factor
    const demandAdjustedRate = occupancyAdjustedRate * demandFactor

    // 5. Cap at maxSurgeMultiplier * baseRate
    const cappedRate = Math.min(demandAdjustedRate, input.baseRate * maxMultiplier)

    // 6. Apply floor / ceiling from rule
    let finalRate = cappedRate
    let floorApplied = false
    let ceilingApplied = false

    if (applicableRule?.minimumPrice !== null && applicableRule?.minimumPrice !== undefined) {
      if (finalRate < applicableRule.minimumPrice) {
        finalRate = applicableRule.minimumPrice
        floorApplied = true
      }
    }
    if (applicableRule?.maximumPrice !== null && applicableRule?.maximumPrice !== undefined) {
      if (finalRate > applicableRule.maximumPrice) {
        finalRate = applicableRule.maximumPrice
        ceilingApplied = true
      }
    }

    // Round to 2 decimal places
    finalRate = Math.round(finalRate * 100) / 100

    return {
      calculatedRate: finalRate,
      baseRate: input.baseRate,
      occupancyFactor,
      demandFactor,
      appliedRuleId: applicableRule?.id ?? null,
      effectiveMultiplier: input.baseRate > 0
        ? Math.round((finalRate / input.baseRate) * 1000) / 1000
        : 1.0,
      breakdown: {
        ruleAdjustment: ruleAdjustedRate - input.baseRate,
        occupancyAdjustment: occupancyAdjustedRate - ruleAdjustedRate,
        demandAdjustment: demandAdjustedRate - occupancyAdjustedRate,
        floorApplied,
        ceilingApplied,
      },
    }
  }

  private findApplicableRule(rules: PricingRule[], targetDate: Date): PricingRule | null {
    const applicable = rules
      .filter(r => r.isApplicableToDate(targetDate))
      .sort((a, b) => b.priority - a.priority)
    return applicable[0] ?? null
  }

  private applyRuleAdjustment(baseRate: number, rule: PricingRule): number {
    switch (rule.adjustmentType) {
      case 'INCREASE':
        if (rule.pricingStrategy === 'FLAT_RATE') return baseRate + rule.adjustmentValue
        return baseRate * (1 + rule.adjustmentValue / 100)
      case 'DECREASE':
        if (rule.pricingStrategy === 'FLAT_RATE') return Math.max(0, baseRate - rule.adjustmentValue)
        return baseRate * (1 - rule.adjustmentValue / 100)
      case 'FIXED':
        return rule.adjustmentValue
      default:
        return baseRate
    }
  }

  private getOccupancyMultiplier(occupancyRate: number): number {
    for (const [threshold, multiplier] of this.OCCUPANCY_TIERS) {
      if (occupancyRate >= threshold) return multiplier
    }
    return 1.0
  }
}
