import type Redis from 'ioredis'
import { RoomType } from '../../domain/entities/RoomType'
import type { RoomTypeProps } from '../../domain/entities/RoomType'

export class RoomTypeCache {
  private readonly PREFIX = 'stayflexi:room-type'

  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number = 300
  ) {}

  private key(id: string): string {
    return `${this.PREFIX}:${id}`
  }

  async get(id: string): Promise<RoomType | null> {
    try {
      const raw = await this.redis.get(this.key(id))
      if (!raw) return null
      const props = JSON.parse(raw) as RoomTypeProps
      props.createdAt = new Date(props.createdAt)
      props.updatedAt = new Date(props.updatedAt)
      return new RoomType(props)
    } catch {
      return null
    }
  }

  async set(roomType: RoomType): Promise<void> {
    try {
      await this.redis.setex(
        this.key(roomType.id),
        this.ttlSeconds,
        JSON.stringify(roomType.toJSON())
      )
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
