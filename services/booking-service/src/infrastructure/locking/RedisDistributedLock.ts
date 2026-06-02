import type Redis from 'ioredis'
import { randomUUID } from 'crypto'

export interface LockOptions {
  ttlMs?: number
  retries?: number
  retryDelayMs?: number
}

export class RedisDistributedLock {
  private readonly LOCK_PREFIX = 'stayflexi:lock'

  // Atomic check-and-delete using Lua (prevents releasing another owner's lock)
  private readonly RELEASE_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `

  constructor(
    private readonly redis: Redis,
    private readonly defaultTtlMs = 30000,
    private readonly defaultRetries = 5,
    private readonly defaultRetryDelayMs = 200
  ) {}

  private buildKey(resource: string): string {
    return `${this.LOCK_PREFIX}:${resource}`
  }

  async acquire(resource: string, options?: LockOptions): Promise<string | null> {
    const token = randomUUID()
    const ttlMs = options?.ttlMs ?? this.defaultTtlMs
    const result = await this.redis.set(this.buildKey(resource), token, 'PX', ttlMs, 'NX')
    return result === 'OK' ? token : null
  }

  async release(resource: string, token: string): Promise<boolean> {
    const result = await this.redis.eval(this.RELEASE_SCRIPT, 1, this.buildKey(resource), token) as number
    return result === 1
  }

  async withLock<T>(resource: string, fn: () => Promise<T>, options?: LockOptions): Promise<T> {
    const retries = options?.retries ?? this.defaultRetries
    const retryDelayMs = options?.retryDelayMs ?? this.defaultRetryDelayMs

    for (let attempt = 0; attempt <= retries; attempt++) {
      const token = await this.acquire(resource, options)
      if (token) {
        try {
          return await fn()
        } finally {
          await this.release(resource, token).catch(() => undefined)
        }
      }
      if (attempt < retries) {
        const delay = retryDelayMs * Math.pow(2, attempt) + Math.random() * 100
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    throw new Error(`Failed to acquire distributed lock for "${resource}" after ${retries} retries`)
  }

  async isLocked(resource: string): Promise<boolean> {
    return (await this.redis.exists(this.buildKey(resource))) === 1
  }
}
