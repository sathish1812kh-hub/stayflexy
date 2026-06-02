import type { ForecastDataPointProps, ForecastConfidence } from '../domain/entities/ForecastDataPoint'

export interface HistoricalMetric {
  date: string
  occupancyRate: number
  adr: number
  revpar: number
  bookingCount: number
}

export interface ForecastInput {
  hotelId: string
  organizationId: string
  targetDates: string[]          // YYYY-MM-DD array
  historicalMetrics: HistoricalMetric[]  // last 90 days
  currentBookings?: number       // bookings already confirmed for future dates
  totalRooms: number
}

export interface ForecastOutput {
  forecasts: Omit<ForecastDataPointProps, 'id' | 'createdAt' | 'updatedAt'>[]
}

export class ForecastEngine {
  // Weighted moving average with seasonal decomposition
  generate(input: ForecastInput): ForecastOutput {
    const forecasts: Omit<ForecastDataPointProps, 'id' | 'createdAt' | 'updatedAt'>[] = []

    const avgOccupancy = this.computeWeightedAvgOccupancy(input.historicalMetrics)
    const avgAdr = this.computeWeightedAvgAdr(input.historicalMetrics)
    const bookingVelocity = this.computeBookingVelocity(input.historicalMetrics)

    for (const targetDate of input.targetDates) {
      const dayOfWeek = new Date(targetDate).getDay()
      const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.15 : 1.00
      const similarDayMetrics = this.getSimilarDayOfWeekMetrics(
        input.historicalMetrics, dayOfWeek,
      )

      const baseOccupancy = similarDayMetrics.length > 0
        ? this.computeWeightedAvgOccupancy(similarDayMetrics)
        : avgOccupancy

      const projectedOccupancy = Math.min(0.99, Math.max(0.05, baseOccupancy * weekendFactor))
      const projectedAdr = Math.round(avgAdr * weekendFactor * 100) / 100
      const projectedRevPar = Math.round(projectedAdr * projectedOccupancy * 100) / 100

      const confidence: ForecastConfidence = input.historicalMetrics.length >= 60
        ? 'HIGH'
        : input.historicalMetrics.length >= 30
          ? 'MEDIUM'
          : 'LOW'

      forecasts.push({
        organizationId: input.organizationId,
        hotelId: input.hotelId,
        forecastDate: targetDate,
        projectedOccupancy,
        projectedAdr,
        projectedRevPar,
        confidence,
        bookingVelocity,
        competitorRateIndex: null,
        eventImpact: null,
        forecastedBy: 'ALGORITHM',
      })
    }

    return { forecasts }
  }

  private computeWeightedAvgOccupancy(metrics: HistoricalMetric[]): number {
    if (metrics.length === 0) return 0.60
    // More recent data gets higher weight
    let weightedSum = 0
    let totalWeight = 0
    metrics.forEach((m, i) => {
      const weight = i + 1
      weightedSum += m.occupancyRate * weight
      totalWeight += weight
    })
    return totalWeight > 0 ? weightedSum / totalWeight : 0.60
  }

  private computeWeightedAvgAdr(metrics: HistoricalMetric[]): number {
    if (metrics.length === 0) return 100
    const avg = metrics.reduce((sum, m) => sum + m.adr, 0) / metrics.length
    return Math.round(avg * 100) / 100
  }

  private computeBookingVelocity(metrics: HistoricalMetric[]): number {
    if (metrics.length < 7) return 0
    const last7 = metrics.slice(-7)
    const totalBookings = last7.reduce((sum, m) => sum + m.bookingCount, 0)
    return Math.round((totalBookings / 7) * 100) / 100
  }

  private getSimilarDayOfWeekMetrics(
    metrics: HistoricalMetric[],
    dayOfWeek: number,
  ): HistoricalMetric[] {
    return metrics.filter(m => new Date(m.date).getDay() === dayOfWeek)
  }
}
