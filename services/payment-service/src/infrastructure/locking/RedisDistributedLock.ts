import type Redis from 'ioredis'
import { randomUUID } from 'crypto'
import type { Logger } from '@stayflexi/shared-logger'

export interface LockOptions {
  ttlMs?: number
  retries?: number
  retryDelayMs?: number
}

export class RedisDistributedLock {
  private readonly LOCK_PREFIX = 'stayflexi:payment:lock'

  // Atomic check-and-delete: only release if token matches owner
  private readonly RELEASE_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `

  constructor(
    private readonly redis: Redis,
    private readonly logger?: Logger,
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
    if (result === 'OK') {
      this.logger?.debug({ resource, ttlMs }, 'Distributed lock acquired')
      return token
    }
    return null
  }

  async release(resource: string, token: string): Promise<boolean> {
    const result = await this.redis.eval(
      this.RELEASE_SCRIPT, 1, this.buildKey(resource), token
    ) as number
    const released = result === 1
    this.logger?.debug({ resource, released }, 'Distributed lock release attempt')
    return released
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
          await this.release(resource, token).catch((err) => {
            this.logger?.warn({ err, resource }, 'Failed to release distributed lock')
          })
        }
      }
      if (attempt < retries) {
        const delay = retryDelayMs * Math.pow(2, attempt) + Math.random() * 100
        await new Promise<void>(resolve => setTimeout(resolve, delay))
      }
    }
    const msg = `Failed to acquire distributed lock for "${resource}" after ${retries} retries`
    this.logger?.error({ resource, retries }, msg)
    throw new Error(msg)
  }

  async isLocked(resource: string): Promise<boolean> {
    return (await this.redis.exists(this.buildKey(resource))) === 1
  }
}
