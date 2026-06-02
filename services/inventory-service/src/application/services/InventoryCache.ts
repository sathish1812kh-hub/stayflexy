import type Redis from 'ioredis'
import { Inventory } from '../../domain/entities/Inventory'
import type { InventoryProps } from '../../domain/entities/Inventory'

export class InventoryCache {
  private readonly PREFIX = 'stayflexi:inventory'

  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number = 60
  ) {}

  private key(roomTypeId: string, dateStr: string): string {
    return `${this.PREFIX}:${roomTypeId}:${dateStr}`
  }

  private calendarKey(hotelId: string, yearMonth: string): string {
    return `${this.PREFIX}:cal:${hotelId}:${yearMonth}`
  }

  async get(roomTypeId: string, date: Date): Promise<Inventory | null> {
    try {
      const dateStr = this.formatDate(date)
      const raw = await this.redis.get(this.key(roomTypeId, dateStr))
      if (!raw) return null
      const props = JSON.parse(raw) as InventoryProps
      props.inventoryDate = new Date(props.inventoryDate)
      props.createdAt = new Date(props.createdAt)
      props.updatedAt = new Date(props.updatedAt)
      return new Inventory(props)
    } catch {
      return null
    }
  }

  async set(inventory: Inventory): Promise<void> {
    try {
      const dateStr = this.formatDate(inventory.inventoryDate)
      await this.redis.setex(
        this.key(inventory.roomTypeId, dateStr),
        this.ttlSeconds,
        JSON.stringify(inventory.toJSON())
      )
    } catch {
      // Cache write failure is non-fatal
    }
  }

  async invalidate(roomTypeId: string, date: Date): Promise<void> {
    try {
      const dateStr = this.formatDate(date)
      await this.redis.del(this.key(roomTypeId, dateStr))
    } catch {
      // Cache invalidation failure is non-fatal
    }
  }

  async invalidateCalendar(hotelId: string, yearMonth: string): Promise<void> {
    try {
      await this.redis.del(this.calendarKey(hotelId, yearMonth))
    } catch {
      // Cache invalidation failure is non-fatal
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10)
  }
}
