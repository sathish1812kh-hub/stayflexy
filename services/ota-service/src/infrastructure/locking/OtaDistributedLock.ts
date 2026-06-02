import { randomUUID } from 'crypto'
import type Redis from 'ioredis'
import { ServiceUnavailableError } from '@stayflexi/shared-errors'
import type { Logger } from '@stayflexi/shared-logger'

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`

export class OtaDistributedLock {
  private readonly LOCK_PREFIX = 'stayflexi:ota:lock'

  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
  ) {}

  private lockKey(resource: string): string {
    return `${this.LOCK_PREFIX}:${resource}`
  }

  async acquire(resource: string, ttlMs = 30000, maxRetries = 5): Promise<string> {
    const token = randomUUID()
    const key = this.lockKey(resource)
    let attempt = 0

    while (attempt < maxRetries) {
      const result = await this.redis.set(key, token, 'NX', 'PX', ttlMs)
      if (result === 'OK') {
        this.logger.debug({ resource, token, attempt }, 'OTA lock acquired')
        return token
      }
      attempt++
      if (attempt < maxRetries) {
        const delayMs = Math.min(100 * Math.pow(2, attempt) + Math.random() * 50, 2000)
        await new Promise<void>(resolve => setTimeout(resolve, delayMs))
      }
    }

    throw new ServiceUnavailableError(`Failed to acquire lock for OTA resource: ${resource}`)
  }

  async release(resource: string, token: string): Promise<void> {
    const key = this.lockKey(resource)
    await this.redis.eval(RELEASE_SCRIPT, 1, key, token)
    this.logger.debug({ resource, token }, 'OTA lock released')
  }

  async withLock<T>(resource: string, fn: () => Promise<T>, ttlMs = 30000): Promise<T> {
    const token = await this.acquire(resource, ttlMs)
    try {
      return await fn()
    } finally {
      await this.release(resource, token).catch((err: unknown) => {
        this.logger.warn({ resource, token, err }, 'Failed to release OTA lock')
      })
    }
  }

  async isLocked(resource: string): Promise<boolean> {
    return (await this.redis.exists(this.lockKey(resource))) === 1
  }
}
