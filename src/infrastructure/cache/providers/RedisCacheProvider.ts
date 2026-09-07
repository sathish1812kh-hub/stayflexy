import type { ICacheProvider, CacheStats } from '../types'

export interface RedisCacheProviderOptions {
  scanBatchSize?: number
  onDegraded?: (err?: Error) => void
}

// Implements ICacheProvider against a Redis connection.
// Activate by: installing `redis` package, passing a redis client instance.
// Production command: npm install redis @types/redis
export class RedisCacheProvider implements ICacheProvider {
  private hits = 0
  private misses = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(
    private readonly client: any,
    private readonly options?: RedisCacheProviderOptions,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const raw = (await this.client.get(key)) as string | null
      if (raw === null) {
        this.misses++
        return null
      }
      this.hits++
      return JSON.parse(raw) as T
    } catch (err) {
      if (this.options?.onDegraded) {
        this.options.onDegraded(err instanceof Error ? err : undefined)
      }
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.client.setEx(key, ttlSeconds, serialized)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.client.set(key, serialized)
      }
    } catch (err) {
      if (this.options?.onDegraded) {
        this.options.onDegraded(err instanceof Error ? err : undefined)
      }
    }
  }

  async del(key: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.client.del(key)
    } catch (err) {
      if (this.options?.onDegraded) {
        this.options.onDegraded(err instanceof Error ? err : undefined)
      }
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const keys = (await this.client.keys(pattern)) as string[]
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (keys.length > 0) await this.client.del(keys)
    } catch (err) {
      if (this.options?.onDegraded) {
        this.options.onDegraded(err instanceof Error ? err : undefined)
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = (await this.client.exists(key)) as number
      return result > 0
    } catch (err) {
      if (this.options?.onDegraded) {
        this.options.onDegraded(err instanceof Error ? err : undefined)
      }
      return false
    }
  }

  async flush(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.client.flushDb()
    } catch (err) {
      if (this.options?.onDegraded) {
        this.options.onDegraded(err instanceof Error ? err : undefined)
      }
    }
  }

  stats(): CacheStats {
    const total = this.hits + this.misses
    const hitRate = total > 0 ? this.hits / total : 0
    return { hits: this.hits, misses: this.misses, keys: 0, hitRate }
  }
}
