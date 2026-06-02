import type Redis from 'ioredis'

const SYNC_JOB_TTL = 3600 // 1 hour
const RESERVATION_DEDUP_TTL = 86400 // 24 hours
const INVENTORY_CACHE_TTL = 300 // 5 minutes

export class OtaSyncCache {
  constructor(private readonly redis: Redis) {}

  // ── Sync job caching ──────────────────────────────────────────────────────

  async getSyncJob(jobId: string): Promise<unknown | null> {
    const val = await this.redis.get(`stayflexi:ota:job:${jobId}`)
    return val ? (JSON.parse(val) as unknown) : null
  }

  async setSyncJob(jobId: string, data: unknown): Promise<void> {
    await this.redis.setex(`stayflexi:ota:job:${jobId}`, SYNC_JOB_TTL, JSON.stringify(data))
  }

  async invalidateSyncJob(jobId: string): Promise<void> {
    await this.redis.del(`stayflexi:ota:job:${jobId}`)
  }

  // ── Reservation deduplication ─────────────────────────────────────────────
  // Returns true if the reservation has already been seen (duplicate).
  async checkReservationDedup(providerId: string, externalId: string): Promise<boolean> {
    const key = `stayflexi:ota:dedup:${providerId}:${externalId}`
    // NX: set only if not exists. Returns 'OK' if set, null if key existed.
    const result = await this.redis.set(key, '1', 'EX', RESERVATION_DEDUP_TTL, 'NX')
    return result === null // null means key already existed → duplicate
  }

  async markReservationProcessed(providerId: string, externalId: string): Promise<void> {
    const key = `stayflexi:ota:dedup:${providerId}:${externalId}`
    await this.redis.setex(key, RESERVATION_DEDUP_TTL, '1')
  }

  // ── Idempotency key ───────────────────────────────────────────────────────

  async getIdempotencyResult(key: string): Promise<string | null> {
    return this.redis.get(`stayflexi:ota:idempotency:${key}`)
  }

  async setIdempotencyResult(key: string, jobId: string): Promise<void> {
    await this.redis.setex(`stayflexi:ota:idempotency:${key}`, SYNC_JOB_TTL, jobId)
  }

  // ── Sync status cache ─────────────────────────────────────────────────────

  async getSyncStatus(hotelId: string, syncType: string): Promise<unknown | null> {
    const val = await this.redis.get(`stayflexi:ota:status:${hotelId}:${syncType}`)
    return val ? (JSON.parse(val) as unknown) : null
  }

  async setSyncStatus(hotelId: string, syncType: string, data: unknown): Promise<void> {
    await this.redis.setex(
      `stayflexi:ota:status:${hotelId}:${syncType}`,
      INVENTORY_CACHE_TTL,
      JSON.stringify(data),
    )
  }
}
