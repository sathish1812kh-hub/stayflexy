import type Redis from 'ioredis'

const KPI_TTL = 300      // 5 minutes
const REPORT_TTL = 600   // 10 minutes
const FORECAST_TTL = 1800 // 30 minutes
const DASHBOARD_TTL = 120 // 2 minutes

export class AnalyticsCache {
  constructor(private readonly redis: Redis) {}

  // KPI metrics cache
  async getKpis(hotelId: string, from: string, to: string): Promise<unknown | null> {
    const val = await this.redis.get(`stayflexi:analytics:kpi:${hotelId}:${from}:${to}`)
    return val ? JSON.parse(val) as unknown : null
  }
  async setKpis(hotelId: string, from: string, to: string, data: unknown): Promise<void> {
    await this.redis.setex(`stayflexi:analytics:kpi:${hotelId}:${from}:${to}`, KPI_TTL, JSON.stringify(data))
  }
  async invalidateKpis(hotelId: string): Promise<void> {
    const keys = await this.redis.keys(`stayflexi:analytics:kpi:${hotelId}:*`)
    if (keys.length > 0) await this.redis.del(...keys)
  }

  // Occupancy cache
  async getOccupancy(hotelId: string, from: string, to: string): Promise<unknown | null> {
    const val = await this.redis.get(`stayflexi:analytics:occupancy:${hotelId}:${from}:${to}`)
    return val ? JSON.parse(val) as unknown : null
  }
  async setOccupancy(hotelId: string, from: string, to: string, data: unknown): Promise<void> {
    await this.redis.setex(`stayflexi:analytics:occupancy:${hotelId}:${from}:${to}`, KPI_TTL, JSON.stringify(data))
  }

  // Revenue report cache
  async getRevenueReport(hotelId: string, from: string, to: string): Promise<unknown | null> {
    const val = await this.redis.get(`stayflexi:analytics:revenue:${hotelId}:${from}:${to}`)
    return val ? JSON.parse(val) as unknown : null
  }
  async setRevenueReport(hotelId: string, from: string, to: string, data: unknown): Promise<void> {
    await this.redis.setex(`stayflexi:analytics:revenue:${hotelId}:${from}:${to}`, REPORT_TTL, JSON.stringify(data))
  }

  // Forecast cache
  async getForecast(hotelId: string, days: number): Promise<unknown | null> {
    const val = await this.redis.get(`stayflexi:analytics:forecast:${hotelId}:${days}`)
    return val ? JSON.parse(val) as unknown : null
  }
  async setForecast(hotelId: string, days: number, data: unknown): Promise<void> {
    await this.redis.setex(`stayflexi:analytics:forecast:${hotelId}:${days}`, FORECAST_TTL, JSON.stringify(data))
  }

  // Dashboard metrics (short TTL)
  async getDashboard(hotelId: string): Promise<unknown | null> {
    const val = await this.redis.get(`stayflexi:analytics:dashboard:${hotelId}`)
    return val ? JSON.parse(val) as unknown : null
  }
  async setDashboard(hotelId: string, data: unknown): Promise<void> {
    await this.redis.setex(`stayflexi:analytics:dashboard:${hotelId}`, DASHBOARD_TTL, JSON.stringify(data))
  }

  // Export status cache
  async getExportStatus(exportId: string): Promise<unknown | null> {
    const val = await this.redis.get(`stayflexi:analytics:export:${exportId}`)
    return val ? JSON.parse(val) as unknown : null
  }
  async setExportStatus(exportId: string, data: unknown, ttl = 3600): Promise<void> {
    await this.redis.setex(`stayflexi:analytics:export:${exportId}`, ttl, JSON.stringify(data))
  }

  // General invalidation
  async invalidateHotel(hotelId: string): Promise<void> {
    const keys = await this.redis.keys(`stayflexi:analytics:*:${hotelId}:*`)
    const dashKey = `stayflexi:analytics:dashboard:${hotelId}`
    const allKeys = [...keys, dashKey]
    if (allKeys.length > 0) await this.redis.del(...allKeys)
  }
}
