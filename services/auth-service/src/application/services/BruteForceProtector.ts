import type Redis from 'ioredis'

export class BruteForceProtector {
  constructor(
    private readonly redis: Redis,
    private readonly maxAttempts: number = 5,
    private readonly windowSeconds: number = 900
  ) {}

  private buildKey(ipAddress: string, email: string): string {
    return `stayflexi:auth:bf:${ipAddress}:${email.toLowerCase()}`
  }

  async isBlocked(ipAddress: string, email: string): Promise<boolean> {
    const key = this.buildKey(ipAddress, email)
    const attempts = await this.redis.get(key)
    return attempts !== null && parseInt(attempts, 10) >= this.maxAttempts
  }

  async recordFailure(ipAddress: string, email: string): Promise<void> {
    const key = this.buildKey(ipAddress, email)
    const pipeline = this.redis.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, this.windowSeconds)
    await pipeline.exec()
  }

  async clearFailures(ipAddress: string, email: string): Promise<void> {
    const key = this.buildKey(ipAddress, email)
    await this.redis.del(key)
  }

  async getAttempts(ipAddress: string, email: string): Promise<number> {
    const key = this.buildKey(ipAddress, email)
    const value = await this.redis.get(key)
    return value ? parseInt(value, 10) : 0
  }
}
