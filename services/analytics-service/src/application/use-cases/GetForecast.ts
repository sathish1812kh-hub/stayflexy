import type { PrismaClient } from '@prisma/client'
import type { AnalyticsCache } from '../../infrastructure/cache/AnalyticsCache'
import type { ForecastQuery } from '../dtos/analytics.dto'
import type { RevenueForecast } from '../../domain/value-objects/KpiMetrics'
import type { Logger } from '@stayflexi/shared-logger'

function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toDateStr(d: Date): string { return d.toISOString().split('T')[0] ?? '' }

export class GetForecast {
  constructor(
    private readonly db: PrismaClient,
    private readonly cache: AnalyticsCache,
    private readonly logger: Logger,
  ) {}

  async execute(query: ForecastQuery): Promise<{ hotelId: string; forecast: RevenueForecast[]; avgDailyRevenue: number; basedOnDays: number }> {
    const cached = await this.cache.getForecast(query.hotelId, query.days)
    if (cached) return cached as { hotelId: string; forecast: RevenueForecast[]; avgDailyRevenue: number; basedOnDays: number }

    const thirtyDaysAgo = addDays(new Date(), -30)
    const recentBookings = await this.db.booking.findMany({
      where: { hotelId: query.hotelId, status: 'CHECKED_OUT', createdAt: { gte: thirtyDaysAgo } },
      select: { finalAmount: true, createdAt: true },
    })

    const dailyTotals: Record<string, number> = {}
    for (const b of recentBookings) {
      const key = toDateStr(b.createdAt)
      dailyTotals[key] = (dailyTotals[key] ?? 0) + b.finalAmount.toNumber()
    }

    const days = Object.keys(dailyTotals)
    const avgDailyRevenue = days.length > 0
      ? Object.values(dailyTotals).reduce((a, v) => a + v, 0) / days.length
      : 0

    const forecast: RevenueForecast[] = []
    const today = new Date()
    for (let i = 1; i <= query.days; i++) {
      forecast.push({
        date: toDateStr(addDays(today, i)),
        estimatedRevenue: Math.round(avgDailyRevenue * Math.pow(1.02, i / 30) * 100) / 100,
        confidence: Math.round(Math.max(0.3, 0.9 - i * 0.015) * 100) / 100,
      })
    }

    const result = { hotelId: query.hotelId, forecast, avgDailyRevenue: Math.round(avgDailyRevenue * 100) / 100, basedOnDays: days.length }
    await this.cache.setForecast(query.hotelId, query.days, result)
    return result
  }
}
