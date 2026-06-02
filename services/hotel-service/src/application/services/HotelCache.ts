import type Redis from 'ioredis'
import { Hotel } from '../../domain/entities/Hotel'
import type { HotelProps } from '../../domain/entities/Hotel'

export class HotelCache {
  private readonly PREFIX = 'stayflexi:hotel'

  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number = 300
  ) {}

  private key(id: string): string {
    return `${this.PREFIX}:${id}`
  }

  async get(id: string): Promise<Hotel | null> {
    try {
      const raw = await this.redis.get(this.key(id))
      if (!raw) return null
      const props = JSON.parse(raw) as HotelProps
      props.createdAt = new Date(props.createdAt)
      props.updatedAt = new Date(props.updatedAt)
      if (props.deletedAt) props.deletedAt = new Date(props.deletedAt)
      return new Hotel(props)
    } catch {
      return null
    }
  }

  async set(hotel: Hotel): Promise<void> {
    try {
      await this.redis.setex(this.key(hotel.id), this.ttlSeconds, JSON.stringify(hotel.toJSON()))
    } catch {
      // Cache write failure is non-fatal
    }
  }

  async invalidate(id: string): Promise<void> {
    try {
      await this.redis.del(this.key(id))
    } catch {
      // Cache invalidation failure is non-fatal
    }
  }
}
