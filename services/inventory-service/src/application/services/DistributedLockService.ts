import { randomUUID } from 'crypto'
import type Redis from 'ioredis'
import { ServiceUnavailableError } from '@stayflexi/shared-errors'
import type { Logger } from '@stayflexi/shared-logger'

// Lua script for atomic check-and-delete (prevents releasing another owner's lock)
const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`

export class DistributedLockService {
  private readonly PREFIX = 'stayflexi:inv:lock'

  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
    private readonly defaultTtlMs: number = 30_000,
    private readonly retryAttempts: number = 3,
    private readonly retryBaseMs: number = 100
  ) {}

  private key(name: string): string {
    return `${this.PREFIX}:${name}`
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async acquire(lockName: string, ttlMs?: number): Promise<string | null> {
    const token = randomUUID()
    const fullKey = this.key(lockName)
    const expiry = ttlMs ?? this.defaultTtlMs

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const result = await this.redis.set(fullKey, token, 'PX', expiry, 'NX')
        if (result === 'OK') {
          this.logger.debug({ lockName, attempt }, 'Distributed lock acquired')
          return token
        }
      } catch (err) {
        this.logger.warn({ err, lockName, attempt }, 'Redis error during lock acquisition')
      }

      if (attempt < this.retryAttempts - 1) {
        await this.delay(this.retryBaseMs * (attempt + 1))
      }
    }

    this.logger.warn({ lockName, retryAttempts: this.retryAttempts }, 'Failed to acquire distributed lock')
    return null
  }

  async release(lockName: string, token: string): Promise<boolean> {
    const fullKey = this.key(lockName)
    try {
      const result = (await this.redis.eval(RELEASE_SCRIPT, 1, fullKey, token)) as number
      if (result === 1) {
        this.logger.debug({ lockName }, 'Distributed lock released')
        return true
      }
      this.logger.warn({ lockName }, 'Lock release skipped — token mismatch or already expired')
      return false
    } catch (err) {
      this.logger.warn({ err, lockName }, 'Redis error during lock release')
      return false
    }
  }

  /**
   * Acquire multiple locks in sorted order (prevents deadlocks) then run fn.
   * Releases all locks in finally, regardless of success or failure.
   */
  async withMultipleLocks<T>(
    lockNames: string[],
    fn: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    // Sort for consistent acquisition order across concurrent callers
    const sorted = [...lockNames].sort()
    const acquired: Array<{ name: string; token: string }> = []

    try {
      for (const name of sorted) {
        const token = await this.acquire(name, ttlMs)
        if (!token) {
          throw new ServiceUnavailableError(
            `Could not acquire inventory lock for '${name}'. The system is busy — please retry.`
          )
        }
        acquired.push({ name, token })
      }

      return await fn()
    } finally {
      // Release in reverse order
      for (const lock of acquired.reverse()) {
        await this.release(lock.name, lock.token)
      }
    }
  }

  async withLock<T>(lockName: string, fn: () => Promise<T>, ttlMs?: number): Promise<T> {
    return this.withMultipleLocks([lockName], fn, ttlMs)
  }

  /** Lock key for a specific room type + date combination */
  static inventoryKey(roomTypeId: string, date: string): string {
    return `${roomTypeId}:${date}`
  }
}
