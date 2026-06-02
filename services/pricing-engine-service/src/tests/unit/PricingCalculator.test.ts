import { PricingCalculator } from '../../engine/PricingCalculator'
import type { PricingRule } from '../../domain/entities/PricingRule'

const makeMockRule = (overrides: Partial<ReturnType<PricingRule['toJSON']>> = {}): PricingRule => {
  const props = {
    id: 'rule-1',
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    roomTypeId: null,
    name: 'Test Rule',
    description: null,
    priority: 10,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    pricingStrategy: 'PERCENTAGE' as const,
    adjustmentType: 'INCREASE' as const,
    adjustmentValue: 10,
    minimumPrice: null,
    maximumPrice: null,
    status: 'ACTIVE' as const,
    appliesTo: null,
    conditions: null,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }

  return {
    id: props.id,
    priority: props.priority,
    minimumPrice: props.minimumPrice,
    maximumPrice: props.maximumPrice,
    adjustmentType: props.adjustmentType,
    pricingStrategy: props.pricingStrategy,
    adjustmentValue: props.adjustmentValue,
    isApplicableToDate: (date: Date) => date >= props.startDate && date <= props.endDate,
    toJSON: () => props,
    belongsToOrganization: (orgId: string) => orgId === props.organizationId,
    status: props.status,
  } as unknown as PricingRule
}

describe('PricingCalculator', () => {
  let calculator: PricingCalculator

  beforeEach(() => {
    calculator = new PricingCalculator()
  })

  describe('occupancy tiers', () => {
    const targetDate = new Date('2026-08-15')

    it('applies 1.0x at low occupancy (≤40%)', () => {
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.35,
        targetDate,
        activeRules: [],
      })
      expect(result.occupancyFactor).toBe(1.0)
      expect(result.calculatedRate).toBe(100)
    })

    it('applies 1.1x at medium occupancy (40–70%)', () => {
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.55,
        targetDate,
        activeRules: [],
      })
      expect(result.occupancyFactor).toBe(1.10)
      expect(result.calculatedRate).toBe(110)
    })

    it('applies 1.25x at high occupancy (70–85%)', () => {
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.75,
        targetDate,
        activeRules: [],
      })
      expect(result.occupancyFactor).toBe(1.25)
      expect(result.calculatedRate).toBe(125)
    })

    it('applies 1.4x at very high occupancy (85–95%)', () => {
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.90,
        targetDate,
        activeRules: [],
      })
      expect(result.occupancyFactor).toBe(1.40)
      expect(result.calculatedRate).toBe(140)
    })

    it('applies 1.6x at near-full occupancy (≥95%)', () => {
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.97,
        targetDate,
        activeRules: [],
      })
      expect(result.occupancyFactor).toBe(1.60)
      expect(result.calculatedRate).toBe(160)
    })
  })

  describe('rule adjustments', () => {
    const targetDate = new Date('2026-08-15')

    it('applies percentage increase rule', () => {
      const rule = makeMockRule({ adjustmentType: 'INCREASE', pricingStrategy: 'PERCENTAGE', adjustmentValue: 20 })
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.35, // 1.0x occupancy factor
        targetDate,
        activeRules: [rule],
      })
      // 100 * 1.20 (rule) * 1.0 (occupancy) = 120
      expect(result.calculatedRate).toBe(120)
      expect(result.appliedRuleId).toBe('rule-1')
    })

    it('applies flat rate rule', () => {
      const rule = makeMockRule({ adjustmentType: 'INCREASE', pricingStrategy: 'FLAT_RATE', adjustmentValue: 25 })
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.35,
        targetDate,
        activeRules: [rule],
      })
      // (100 + 25) * 1.0 (occupancy) = 125
      expect(result.calculatedRate).toBe(125)
    })

    it('applies FIXED rule — sets absolute price', () => {
      const rule = makeMockRule({ adjustmentType: 'FIXED', adjustmentValue: 80 })
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.35,
        targetDate,
        activeRules: [rule],
      })
      // Fixed = 80, then * 1.0 occupancy = 80
      expect(result.calculatedRate).toBe(80)
    })

    it('respects minimumPrice floor', () => {
      const rule = makeMockRule({
        adjustmentType: 'DECREASE', pricingStrategy: 'PERCENTAGE', adjustmentValue: 50,
        minimumPrice: 60,
      })
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.35,
        targetDate,
        activeRules: [rule],
      })
      // 100 * 0.50 = 50, but floor is 60
      expect(result.calculatedRate).toBe(60)
      expect(result.breakdown.floorApplied).toBe(true)
    })

    it('respects maximumPrice ceiling', () => {
      const rule = makeMockRule({ maximumPrice: 130 })
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.97, // 1.6x = 160
        targetDate,
        activeRules: [rule],
      })
      expect(result.calculatedRate).toBe(130)
      expect(result.breakdown.ceilingApplied).toBe(true)
    })
  })

  describe('surge multiplier cap', () => {
    it('caps rate at 3.0x base by default', () => {
      const rule = makeMockRule({ adjustmentType: 'INCREASE', pricingStrategy: 'PERCENTAGE', adjustmentValue: 500 })
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.99,
        targetDate: new Date('2026-08-15'),
        activeRules: [rule],
        maxSurgeMultiplier: 3.0,
      })
      expect(result.calculatedRate).toBeLessThanOrEqual(300)
      expect(result.effectiveMultiplier).toBeLessThanOrEqual(3.0)
    })

    it('respects custom maxSurgeMultiplier', () => {
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.99,
        targetDate: new Date('2026-08-15'),
        activeRules: [],
        maxSurgeMultiplier: 2.0,
      })
      expect(result.calculatedRate).toBeLessThanOrEqual(200)
    })
  })

  describe('demand factor', () => {
    it('applies demand factor to computed rate', () => {
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.35,
        targetDate: new Date('2026-08-15'),
        activeRules: [],
        demandFactor: 1.20,
      })
      expect(result.demandFactor).toBe(1.20)
      expect(result.calculatedRate).toBe(120)
    })
  })

  describe('rule applicability', () => {
    it('ignores rules outside their date range', () => {
      const expiredRule = makeMockRule({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        adjustmentType: 'INCREASE',
        pricingStrategy: 'PERCENTAGE',
        adjustmentValue: 50,
      })
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.35,
        targetDate: new Date('2026-08-15'),
        activeRules: [expiredRule],
      })
      // Rule is expired — no adjustment applied
      expect(result.calculatedRate).toBe(100)
      expect(result.appliedRuleId).toBeNull()
    })

    it('selects highest-priority rule when multiple apply', () => {
      const lowPriority = makeMockRule({ id: 'low', priority: 5, adjustmentValue: 10 })
      const highPriority = makeMockRule({ id: 'high', priority: 20, adjustmentValue: 30 })
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.35,
        targetDate: new Date('2026-08-15'),
        activeRules: [lowPriority, highPriority],
      })
      expect(result.appliedRuleId).toBe('high')
    })
  })

  describe('effectiveMultiplier', () => {
    it('reports effective multiplier relative to base', () => {
      const result = calculator.compute({
        baseRate: 100,
        currentOccupancy: 0.75,
        targetDate: new Date('2026-08-15'),
        activeRules: [],
      })
      expect(result.effectiveMultiplier).toBe(1.25)
    })
  })
})
