import type Redis from 'ioredis'

export interface PaymentIdempotencyRecord {
  statusCode: number
  body: unknown
  createdAt: string
}

export type IdempotencyCheckResult = PaymentIdempotencyRecord | 'PROCESSING' | null

export class PaymentIdempotencyStore {
  private readonly PREFIX = 'stayflexi:idempotency:payment'
  private readonly PROCESSING = '__PROCESSING__'

  constructor(private readonly redis: Redis, private readonly ttlSeconds = 86400) {}

  private key(k: string) { return `${this.PREFIX}:${k}` }

  async get(key: string): Promise<IdempotencyCheckResult> {
    const raw = await this.redis.get(this.key(key))
    if (raw === null) return null
    if (raw === this.PROCESSING) return 'PROCESSING'
    try { return JSON.parse(raw) as PaymentIdempotencyRecord } catch { return null }
  }

  async markProcessing(key: string): Promise<boolean> {
    const result = await this.redis.set(this.key(key), this.PROCESSING, 'EX', 60, 'NX')
    return result === 'OK'
  }

  async store(key: string, record: PaymentIdempotencyRecord): Promise<void> {
    await this.redis.setex(this.key(key), this.ttlSeconds, JSON.stringify(record))
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(this.key(key))
  }
}
