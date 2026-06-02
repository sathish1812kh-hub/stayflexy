import type Redis from 'ioredis'

export interface IdempotencyRecord {
  statusCode: number
  body: unknown
  createdAt: string
}

export type IdempotencyResult = IdempotencyRecord | 'PROCESSING' | null

export class IdempotencyStore {
  private readonly PREFIX = 'stayflexi:idempotency:booking'
  private readonly PROCESSING = '__PROCESSING__'

  constructor(private readonly redis: Redis, private readonly ttlSeconds = 86400) {}

  private key(k: string) { return `${this.PREFIX}:${k}` }

  async get(idempotencyKey: string): Promise<IdempotencyResult> {
    const raw = await this.redis.get(this.key(idempotencyKey))
    if (raw === null) return null
    if (raw === this.PROCESSING) return 'PROCESSING'
    try { return JSON.parse(raw) as IdempotencyRecord } catch { return null }
  }

  async markProcessing(idempotencyKey: string): Promise<boolean> {
    const result = await this.redis.set(this.key(idempotencyKey), this.PROCESSING, 'EX', 60, 'NX')
    return result === 'OK'
  }

  async store(idempotencyKey: string, record: IdempotencyRecord): Promise<void> {
    await this.redis.setex(this.key(idempotencyKey), this.ttlSeconds, JSON.stringify(record))
  }

  async delete(idempotencyKey: string): Promise<void> {
    await this.redis.del(this.key(idempotencyKey))
  }
}
