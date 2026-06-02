import type Redis from 'ioredis'
import { Room } from '../../domain/entities/Room'
import type { RoomProps } from '../../domain/entities/Room'

export class RoomCache {
  private readonly PREFIX = 'stayflexi:room'

  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number = 60
  ) {}

  private key(id: string): string {
    return `${this.PREFIX}:${id}`
  }

  async get(id: string): Promise<Room | null> {
    try {
      const raw = await this.redis.get(this.key(id))
      if (!raw) return null
      const props = JSON.parse(raw) as RoomProps
      props.createdAt = new Date(props.createdAt)
      props.updatedAt = new Date(props.updatedAt)
      return new Room(props)
    } catch {
      return null
    }
  }

  async set(room: Room): Promise<void> {
    try {
      await this.redis.setex(this.key(room.id), this.ttlSeconds, JSON.stringify(room.toJSON()))
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
