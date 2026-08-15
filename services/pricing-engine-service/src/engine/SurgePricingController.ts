import type Redis from 'ioredis'
import type { Logger } from '@stayflexi/shared-logger'

export interface SurgeConfig {
  hotelId: string
  organizationId: string
  roomTypeId?: string
  surgeMultiplier?: number
  multiplier?: number
  reason: string
  expiresAt?: Date
  durationSeconds?: number
  appliedById: string
}

export interface ActiveSurge {
  hotelId: string
  organizationId: string
  roomTypeId?: string
  multiplier: number
  surgeMultiplier: number
  reason: string
  expiresAt: Date
  appliedAt: Date
  appliedById: string
}

export class SurgePricingController {
  private readonly KEY_PREFIX = 'stayflexi:pricing:surge'
  private readonly MAX_SURGE_MULTIPLIER = 3.0

  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
  ) {}

  async applySurge(config: SurgeConfig): Promise<ActiveSurge> {
    const multiplier = config.multiplier ?? config.surgeMultiplier ?? 1.0
    if (multiplier > this.MAX_SURGE_MULTIPLIER) {
      throw new Error(`Surge multiplier ${multiplier} exceeds maximum ${this.MAX_SURGE_MULTIPLIER}`)
    }
    if (multiplier < 1.0) {
      throw new Error('Surge multiplier must be greater than or equal to 1.0')
    }

    const key = this.buildKey(config.hotelId, config.roomTypeId)
    const now = new Date()
    const expiresAt =
      config.expiresAt ?? new Date(now.getTime() + (config.durationSeconds ?? 3600) * 1000)
    const ttlSeconds = Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)

    if (ttlSeconds <= 0) {
      throw new Error('Surge pricing expiresAt must be in the future')
    }

    const surge: ActiveSurge = {
      hotelId: config.hotelId,
      organizationId: config.organizationId,
      roomTypeId: config.roomTypeId,
      multiplier,
      surgeMultiplier: multiplier,
      reason: config.reason,
      expiresAt,
      appliedAt: now,
      appliedById: config.appliedById,
    }

    if (typeof (this.redis as any).set === 'function') {
      await (this.redis as any).set(key, JSON.stringify(surge), 'EX', ttlSeconds)
    } else {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(surge))
    }

    this.logger.info(
      {
        hotelId: config.hotelId,
        roomTypeId: config.roomTypeId,
        multiplier,
        expiresAt,
      },
      'Surge pricing applied',
    )

    return surge
  }

  async removeSurge(hotelId: string, roomTypeId?: string): Promise<boolean> {
    const key = this.buildKey(hotelId, roomTypeId)
    const removed = await this.redis.del(key)
    if (removed > 0) {
      this.logger.info({ hotelId, roomTypeId }, 'Surge pricing removed')
    }
    return removed > 0
  }

  async getActiveSurge(hotelId: string, roomTypeId?: string): Promise<ActiveSurge | null> {
    // Check room-type specific surge first, then hotel-wide
    if (roomTypeId) {
      const roomSurge = await this.getSurgeFromRedis(this.buildKey(hotelId, roomTypeId))
      if (roomSurge) return roomSurge
    }
    // Fallback to hotel-wide surge
    return this.getSurgeFromRedis(this.buildKey(hotelId, undefined))
  }

  private async getSurgeFromRedis(key: string): Promise<ActiveSurge | null> {
    const raw = await this.redis.get(key).catch(() => null)
    if (!raw) return null
    try {
      return JSON.parse(raw) as ActiveSurge
    } catch {
      return null
    }
  }

  private buildKey(hotelId: string, roomTypeId?: string): string {
    return roomTypeId
      ? `${this.KEY_PREFIX}:${hotelId}:${roomTypeId}`
      : `${this.KEY_PREFIX}:${hotelId}`
  }
}
