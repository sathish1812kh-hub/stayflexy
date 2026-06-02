import type Redis from 'ioredis'

const FORECAST_TTL = 3600        // 1 hour — forecasts are stable
const RECOMMENDATION_TTL = 600   // 10 min — recommendations change with occupancy

export class RevenueCache {
  constructor(private readonly redis: Redis) {}

  async getForecast(hotelId: string, dateStr: string): Promise<unknown | null> {
    const val = await this.redis.get(`stayflexi:revenue:forecast:${hotelId}:${dateStr}`).catch(() => null)
    return val ? JSON.parse(val) : null
  }

  async setForecast(hotelId: string, dateStr: string, data: unknown): Promise<void> {
    await this.redis.setex(
      `stayflexi:revenue:forecast:${hotelId}:${dateStr}`,
      FORECAST_TTL,
      JSON.stringify(data),
    ).catch(() => {})
  }

  async getRecommendation(roomTypeId: string, targetDate: string): Promise<unknown | null> {
    const val = await this.redis.get(`stayflexi:revenue:rec:${roomTypeId}:${targetDate}`).catch(() => null)
    return val ? JSON.parse(val) : null
  }

  async setRecommendation(roomTypeId: string, targetDate: string, data: unknown): Promise<void> {
    await this.redis.setex(
      `stayflexi:revenue:rec:${roomTypeId}:${targetDate}`,
      RECOMMENDATION_TTL,
      JSON.stringify(data),
    ).catch(() => {})
  }

  async invalidateHotelRecommendations(hotelId: string): Promise<void> {
    await this.redis.set(`stayflexi:revenue:dirty:${hotelId}`, '1', 'EX', 300).catch(() => {})
  }
}
