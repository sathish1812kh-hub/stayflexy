import type { ForecastDataPoint } from '../domain/entities/ForecastDataPoint'
import type { RevenueTargetProps } from '../domain/entities/RevenueTarget'
import type { RateRecommendationProps } from '../domain/entities/RateRecommendation'

export interface OptimizationInput {
  organizationId: string
  hotelId: string
  roomTypeId: string
  targetDate: string             // YYYY-MM-DD
  basePrice: number
  currentOccupancy: number       // 0.0–1.0
  forecast: ForecastDataPoint | null
  target: RevenueTargetProps | null
  maxPrice?: number
  minPrice?: number
}

export interface OptimizationResult {
  recommendation: Omit<RateRecommendationProps, 'id' | 'createdAt'>
}

export class RevenueOptimizer {
  // Optimal price = base × occupancy_factor × demand_factor × target_pressure
  // Target pressure: if behind target, increase price slightly; if ahead, can soften
  optimize(input: OptimizationInput): OptimizationResult {
    const occupancyFactor = this.getOccupancyFactor(input.currentOccupancy)
    const demandFactor = input.forecast ? input.forecast.demandFactor : 1.0
    const targetPressure = this.getTargetPressure(input.target)
    const seasonalFactor = this.getSeasonalFactor(input.targetDate)

    const rawPrice = input.basePrice * occupancyFactor * demandFactor * targetPressure * seasonalFactor

    const minPrice = input.minPrice ?? input.basePrice * 0.70  // floor = 70% of base
    const maxPrice = input.maxPrice ?? input.basePrice * 3.00  // ceiling = 3x base

    const boundedPrice = Math.max(minPrice, Math.min(maxPrice, rawPrice))
    const recommendedPrice = Math.round(boundedPrice * 100) / 100

    const confidenceScore = this.computeConfidence(input.forecast, input.target)
    const rationale = this.buildRationale(occupancyFactor, demandFactor, targetPressure, seasonalFactor)

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h TTL

    return {
      recommendation: {
        organizationId: input.organizationId,
        hotelId: input.hotelId,
        roomTypeId: input.roomTypeId,
        targetDate: input.targetDate,
        basePrice: input.basePrice,
        recommendedPrice,
        minPrice,
        maxPrice,
        confidenceScore,
        occupancyFactor,
        seasonalFactor,
        demandFactor,
        rationale,
        appliedAt: null,
        expiresAt,
      },
    }
  }

  private getOccupancyFactor(occupancy: number): number {
    if (occupancy >= 0.95) return 1.50
    if (occupancy >= 0.85) return 1.35
    if (occupancy >= 0.70) return 1.20
    if (occupancy >= 0.50) return 1.05
    if (occupancy <= 0.30) return 0.92
    return 1.00
  }

  private getTargetPressure(target: RevenueTargetProps | null): number {
    if (!target?.actualRevenue) return 1.00
    const achievement = target.actualRevenue / target.targetRevenue
    if (achievement < 0.80) return 1.08   // behind target → push rate up
    if (achievement < 0.90) return 1.04
    if (achievement > 1.10) return 0.97   // ahead of target → soften slightly
    return 1.00
  }

  private getSeasonalFactor(targetDate: string): number {
    const month = parseInt(targetDate.split('-')[1] ?? '6', 10)
    // Northern hemisphere approximation
    const SEASONAL = [0.85, 0.85, 0.95, 1.00, 1.05, 1.15, 1.20, 1.20, 1.05, 1.00, 0.90, 1.10]
    return SEASONAL[month - 1] ?? 1.00
  }

  private computeConfidence(forecast: ForecastDataPoint | null, target: RevenueTargetProps | null): number {
    let score = 0.50
    if (forecast) {
      score += forecast.confidence === 'HIGH' ? 0.30 : forecast.confidence === 'MEDIUM' ? 0.20 : 0.10
    }
    if (target?.actualRevenue) score += 0.10
    if (forecast?.bookingVelocity && forecast.bookingVelocity > 2) score += 0.10
    return Math.min(0.99, Math.round(score * 1000) / 1000)
  }

  private buildRationale(
    occupancyFactor: number,
    demandFactor: number,
    targetPressure: number,
    seasonalFactor: number,
  ): string {
    const parts: string[] = []
    if (occupancyFactor > 1.1) parts.push(`high occupancy (+${Math.round((occupancyFactor - 1) * 100)}%)`)
    if (occupancyFactor < 0.95) parts.push(`low occupancy (${Math.round((occupancyFactor - 1) * 100)}%)`)
    if (demandFactor > 1.1) parts.push(`strong demand forecast (+${Math.round((demandFactor - 1) * 100)}%)`)
    if (demandFactor < 0.95) parts.push(`weak demand forecast (${Math.round((demandFactor - 1) * 100)}%)`)
    if (targetPressure > 1.0) parts.push('below revenue target')
    if (seasonalFactor > 1.1) parts.push('peak season premium')
    if (seasonalFactor < 0.95) parts.push('low season adjustment')
    return parts.length > 0 ? `Rate adjusted for: ${parts.join(', ')}` : 'Rates within normal range'
  }
}
