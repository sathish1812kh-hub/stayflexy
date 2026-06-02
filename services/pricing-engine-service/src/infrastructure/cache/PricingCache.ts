import type Redis from 'ioredis'

const RATE_TTL = 300          // 5 min — rates recomputed hourly but cache refreshed on change
const OCCUPANCY_TTL = 120     // 2 min — occupancy changes frequently

export class PricingCache {
  constructor(private readonly redis: Redis) {}

  async getRate(roomTypeId: string, dateStr: string): Promise<number | null> {
    const val = await this.redis.get(`stayflexi:pricing:rate:${roomTypeId}:${dateStr}`).catch(() => null)
    return val ? Number(val) : null
  }

  async setRate(roomTypeId: string, dateStr: string, rate: number): Promise<void> {
    await this.redis.setex(`stayflexi:pricing:rate:${roomTypeId}:${dateStr}`, RATE_TTL, String(rate)).catch(() => {})
  }

  async invalidateRate(roomTypeId: string, dateStr: string): Promise<void> {
    await this.redis.del(`stayflexi:pricing:rate:${roomTypeId}:${dateStr}`).catch(() => {})
  }

  async invalidateHotelRates(hotelId: string): Promise<void> {
    // Scan for all rate keys for this hotel's room types is complex — use a hotel-level dirty flag
    await this.redis.set(`stayflexi:pricing:dirty:${hotelId}`, '1', 'EX', RATE_TTL).catch(() => {})
  }

  async isHotelDirty(hotelId: string): Promise<boolean> {
    const val = await this.redis.get(`stayflexi:pricing:dirty:${hotelId}`).catch(() => null)
    return val !== null
  }

  async clearHotelDirty(hotelId: string): Promise<void> {
    await this.redis.del(`stayflexi:pricing:dirty:${hotelId}`).catch(() => {})
  }

  async getOccupancy(hotelId: string, dateStr: string): Promise<number | null> {
    const val = await this.redis.get(`stayflexi:pricing:occupancy:${hotelId}:${dateStr}`).catch(() => null)
    return val ? Number(val) : null
  }

  async setOccupancy(hotelId: string, dateStr: string, occupancy: number): Promise<void> {
    await this.redis.setex(`stayflexi:pricing:occupancy:${hotelId}:${dateStr}`, OCCUPANCY_TTL, String(occupancy)).catch(() => {})
  }
}
