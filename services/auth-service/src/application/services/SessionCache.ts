import type Redis from 'ioredis'
import type { AuthUserResponse } from '../dtos/auth.dto'

export class SessionCache {
  private readonly KEY_PREFIX = 'stayflexi:auth:session'

  constructor(private readonly redis: Redis) {}

  private key(userId: string): string {
    return `${this.KEY_PREFIX}:${userId}`
  }

  async setSession(userId: string, data: AuthUserResponse, ttlSeconds: number): Promise<void> {
    await this.redis.setex(this.key(userId), ttlSeconds, JSON.stringify(data))
  }

  async getSession(userId: string): Promise<AuthUserResponse | null> {
    const raw = await this.redis.get(this.key(userId))
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUserResponse
    } catch {
      return null
    }
  }

  async deleteSession(userId: string): Promise<void> {
    await this.redis.del(this.key(userId))
  }

  async blacklistToken(jti: string, expiresInSeconds: number): Promise<void> {
    await this.redis.setex(`stayflexi:auth:blacklist:${jti}`, expiresInSeconds, '1')
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    const exists = await this.redis.exists(`stayflexi:auth:blacklist:${jti}`)
    return exists === 1
  }
}
