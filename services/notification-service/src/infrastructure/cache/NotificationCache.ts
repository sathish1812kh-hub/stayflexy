import type Redis from 'ioredis'

const NOTIFICATION_TTL = 300 // 5 minutes
const DEDUP_TTL = 3600 // 1 hour
const RETRY_STATUS_TTL = 600 // 10 minutes

export class NotificationCache {
  constructor(private readonly redis: Redis) {}

  async getNotification(id: string): Promise<unknown | null> {
    try {
      const key = `stayflexi:notif:${id}`
      const raw = await this.redis.get(key)
      if (!raw) return null
      return JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }

  async setNotification(id: string, data: unknown): Promise<void> {
    try {
      const key = `stayflexi:notif:${id}`
      await this.redis.set(key, JSON.stringify(data), 'EX', NOTIFICATION_TTL)
    } catch {
      // Cache errors are non-fatal
    }
  }

  async invalidateNotification(id: string): Promise<void> {
    try {
      const key = `stayflexi:notif:${id}`
      await this.redis.del(key)
    } catch {
      // Cache errors are non-fatal
    }
  }

  /**
   * Returns true if the message is a duplicate (already seen within the dedup window).
   * Uses SET NX (only set if not exists) — returns null if key already existed.
   */
  async checkDedup(
    organizationId: string,
    recipient: string,
    messageHash: string,
  ): Promise<boolean> {
    try {
      const key = `stayflexi:notif:dedup:${organizationId}:${recipient}:${messageHash}`
      const result = await this.redis.set(key, '1', 'EX', DEDUP_TTL, 'NX')
      return result === null // null = key already existed = duplicate
    } catch {
      // On Redis failure, allow the message through (fail open)
      return false
    }
  }

  async getRetryStatus(notificationId: string): Promise<string | null> {
    try {
      const key = `stayflexi:notif:retry:${notificationId}`
      return await this.redis.get(key)
    } catch {
      return null
    }
  }

  async setRetryStatus(notificationId: string, status: string): Promise<void> {
    try {
      const key = `stayflexi:notif:retry:${notificationId}`
      await this.redis.set(key, status, 'EX', RETRY_STATUS_TTL)
    } catch {
      // Cache errors are non-fatal
    }
  }
}
