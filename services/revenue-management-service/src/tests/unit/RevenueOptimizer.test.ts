import { RevenueOptimizer } from '../../algorithms/RevenueOptimizer'
import type { OptimizationInput } from '../../algorithms/RevenueOptimizer'
import type { ForecastDataPoint } from '../../domain/entities/ForecastDataPoint'
import type { RevenueTargetProps } from '../../domain/entities/RevenueTarget'

const makeForecast = (overrides: Partial<ReturnType<ForecastDataPoint['toJSON']>> = {}): ForecastDataPoint => {
  const props = {
    id: 'fc-1',
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    forecastDate: '2026-08-01',
    projectedOccupancy: 0.75,
    projectedAdr: 150,
    projectedRevPar: 112.5,
    confidence: 'HIGH' as const,
    bookingVelocity: 5,
    competitorRateIndex: null,
    eventImpact: null,
    forecastedBy: 'ALGORITHM',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
  return {
    confidence: props.confidence,
    bookingVelocity: props.bookingVelocity,
    toJSON: () => props,
    get demandFactor() {
      // Mimic ForecastDataPoint demandFactor getter
      const velocity = props.bookingVelocity
      if (velocity === null) return 1.0
      if (velocity >= 10) return 1.15
      if (velocity >= 5) return 1.05
      if (velocity <= 1) return 0.90
      return 1.0
    },
  } as unknown as ForecastDataPoint
}

const makeTarget = (overrides: Partial<RevenueTargetProps> = {}): RevenueTargetProps => ({
  id: 'tgt-1',
  organizationId: 'org-1',
  hotelId: 'hotel-1',
  targetPeriod: '2026-08',
  targetRevenue: 100_000,
  targetRevPar: 120,
  targetAdr: 160,
  targetOccupancy: 0.75,
  actualRevenue: null,
  actualRevPar: null,
  actualAdr: null,
  actualOccupancy: null,
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeInput = (overrides: Partial<OptimizationInput> = {}): OptimizationInput => ({
  organizationId: 'org-1',
  hotelId: 'hotel-1',
  roomTypeId: 'rt-101',
  targetDate: '2026-08-01',
  basePrice: 100,
  currentOccupancy: 0.70,
  forecast: null,
  target: null,
  ...overrides,
})

describe('RevenueOptimizer', () => {
  let optimizer: RevenueOptimizer

  beforeEach(() => {
    optimizer = new RevenueOptimizer()
  })

  describe('occupancy factor', () => {
    it('applies 0.92 factor at ≤30% occupancy', () => {
      const result = optimizer.optimize(makeInput({ currentOccupancy: 0.25 }))
      expect(result.recommendation.occupancyFactor).toBe(0.92)
      // 100 * 0.92 * 1.0 (demand) * 1.0 (target) * seasonal
      expect(result.recommendation.recommendedPrice).toBeLessThan(100)
    })

    it('applies 1.0 factor at 30–50% occupancy', () => {
      const result = optimizer.optimize(makeInput({ currentOccupancy: 0.40 }))
      expect(result.recommendation.occupancyFactor).toBe(1.0)
    })

    it('applies 1.2 factor at 70–85% occupancy', () => {
      const result = optimizer.optimize(makeInput({ currentOccupancy: 0.75 }))
      expect(result.recommendation.occupancyFactor).toBe(1.20)
    })

    it('applies 1.5 factor at ≥95% occupancy', () => {
      const result = optimizer.optimize(makeInput({ currentOccupancy: 0.96 }))
      expect(result.recommendation.occupancyFactor).toBe(1.50)
    })
  })

  describe('target pressure', () => {
    it('applies 1.08 pressure when behind target by >20%', () => {
      const target = makeTarget({ actualRevenue: 75_000, targetRevenue: 100_000 }) // 75% achievement
      const result = optimizer.optimize(makeInput({ target, currentOccupancy: 0.70 }))
      // targetPressure = 1.08, occupancyFactor = 1.2 (70–85%)
      const baseResult = optimizer.optimize(makeInput({ currentOccupancy: 0.70 }))
      expect(result.recommendation.recommendedPrice).toBeGreaterThan(baseResult.recommendation.recommendedPrice)
    })

    it('applies 0.97 factor when ahead of target by >10%', () => {
      const target = makeTarget({ actualRevenue: 115_000, targetRevenue: 100_000 }) // 115% achievement
      const result = optimizer.optimize(makeInput({ target, currentOccupancy: 0.70 }))
      const baseResult = optimizer.optimize(makeInput({ currentOccupancy: 0.70 }))
      // Ahead of target → soften price
      expect(result.recommendation.recommendedPrice).toBeLessThan(baseResult.recommendation.recommendedPrice)
    })

    it('applies no pressure when target has no actual revenue', () => {
      const target = makeTarget({ actualRevenue: null })
      const result = optimizer.optimize(makeInput({ target }))
      const baseResult = optimizer.optimize(makeInput())
      // Same price since no actual data
      expect(result.recommendation.recommendedPrice).toBe(baseResult.recommendation.recommendedPrice)
    })
  })

  describe('seasonal factor', () => {
    it('applies July premium (1.2x)', () => {
      const july = optimizer.optimize(makeInput({ targetDate: '2026-07-15', currentOccupancy: 0.40 }))
      const march = optimizer.optimize(makeInput({ targetDate: '2026-03-15', currentOccupancy: 0.40 }))
      // July seasonal = 1.20, March = 0.95
      expect(july.recommendation.seasonalFactor).toBe(1.20)
      expect(march.recommendation.seasonalFactor).toBe(0.95)
      expect(july.recommendation.recommendedPrice).toBeGreaterThan(march.recommendation.recommendedPrice)
    })

    it('applies December premium (1.1x)', () => {
      const result = optimizer.optimize(makeInput({ targetDate: '2026-12-20', currentOccupancy: 0.40 }))
      expect(result.recommendation.seasonalFactor).toBe(1.10)
    })
  })

  describe('price bounds', () => {
    it('never goes below 70% of base (floor)', () => {
      // Very low occupancy + weak demand → could drop, but floor is 70%
      const result = optimizer.optimize(makeInput({
        currentOccupancy: 0.20, // 0.92 factor
        targetDate: '2026-02-15', // Feb = 0.85 seasonal
      }))
      expect(result.recommendation.recommendedPrice).toBeGreaterThanOrEqual(100 * 0.70)
    })

    it('never exceeds 3x base (ceiling)', () => {
      const result = optimizer.optimize(makeInput({
        currentOccupancy: 0.99, // 1.5x
        targetDate: '2026-07-15', // 1.2x seasonal
        target: makeTarget({ actualRevenue: 50_000, targetRevenue: 100_000 }), // 1.08x pressure
      }))
      expect(result.recommendation.recommendedPrice).toBeLessThanOrEqual(100 * 3.00)
    })

    it('respects custom minPrice override', () => {
      const result = optimizer.optimize(makeInput({ minPrice: 90, currentOccupancy: 0.20 }))
      expect(result.recommendation.recommendedPrice).toBeGreaterThanOrEqual(90)
    })

    it('respects custom maxPrice override', () => {
      const result = optimizer.optimize(makeInput({ maxPrice: 120, currentOccupancy: 0.99 }))
      expect(result.recommendation.recommendedPrice).toBeLessThanOrEqual(120)
    })
  })

  describe('confidence score', () => {
    it('starts at 0.50 with no forecast or target', () => {
      const result = optimizer.optimize(makeInput())
      expect(result.recommendation.confidenceScore).toBe(0.50)
    })

    it('increases with HIGH confidence forecast', () => {
      const forecast = makeForecast({ confidence: 'HIGH', bookingVelocity: 1 })
      const result = optimizer.optimize(makeInput({ forecast }))
      expect(result.recommendation.confidenceScore).toBeGreaterThan(0.50)
    })

    it('increases with actual revenue data in target', () => {
      const target = makeTarget({ actualRevenue: 80_000 })
      const result = optimizer.optimize(makeInput({ target }))
      expect(result.recommendation.confidenceScore).toBeGreaterThan(0.50)
    })

    it('never exceeds 0.99', () => {
      const forecast = makeForecast({ confidence: 'HIGH', bookingVelocity: 15 })
      const target = makeTarget({ actualRevenue: 90_000 })
      const result = optimizer.optimize(makeInput({ forecast, target }))
      expect(result.recommendation.confidenceScore).toBeLessThanOrEqual(0.99)
    })
  })

  describe('rationale', () => {
    it('generates rationale for high occupancy', () => {
      const result = optimizer.optimize(makeInput({ currentOccupancy: 0.92 }))
      expect(result.recommendation.rationale).toContain('high occupancy')
    })

    it('generates rationale for low occupancy', () => {
      const result = optimizer.optimize(makeInput({ currentOccupancy: 0.20 }))
      expect(result.recommendation.rationale).toContain('low occupancy')
    })

    it('generates rationale for being below target', () => {
      const target = makeTarget({ actualRevenue: 70_000, targetRevenue: 100_000 })
      const result = optimizer.optimize(makeInput({ target }))
      expect(result.recommendation.rationale).toContain('below revenue target')
    })

    it('generates default rationale when everything is normal', () => {
      const result = optimizer.optimize(makeInput({ currentOccupancy: 0.55 }))
      expect(result.recommendation.rationale).toBe('Rates within normal range')
    })
  })

  describe('recommendation metadata', () => {
    it('sets hotelId, roomTypeId, targetDate from input', () => {
      const result = optimizer.optimize(makeInput({
        hotelId: 'h-999',
        roomTypeId: 'rt-777',
        targetDate: '2026-09-01',
      }))
      expect(result.recommendation.hotelId).toBe('h-999')
      expect(result.recommendation.roomTypeId).toBe('rt-777')
      expect(result.recommendation.targetDate).toBe('2026-09-01')
    })

    it('sets expiresAt to 24 hours from now', () => {
      const before = Date.now()
      const result = optimizer.optimize(makeInput())
      const after = Date.now()
      const expiresMs = result.recommendation.expiresAt.getTime()
      expect(expiresMs).toBeGreaterThanOrEqual(before + 24 * 3600 * 1000 - 100)
      expect(expiresMs).toBeLessThanOrEqual(after + 24 * 3600 * 1000 + 100)
    })
  })
})
