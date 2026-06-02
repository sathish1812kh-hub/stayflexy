import type { ICacheProvider, CacheStats } from "../types";

// Implements ICacheProvider against a Redis connection.
// Activate by: installing `redis` package, passing a redis client instance.
// Production command: npm install redis @types/redis
export class RedisCacheProvider implements ICacheProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly client: any) {}

  async get<T>(key: string): Promise<T | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const raw = await this.client.get(key) as string | null;
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.client.setEx(key, ttlSeconds, serialized);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.client.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const keys = await this.client.keys(pattern) as string[];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (keys.length > 0) await this.client.del(keys);
  }

  async exists(key: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = await this.client.exists(key) as number;
    return result > 0;
  }

  async flush(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.client.flushDb();
  }

  stats(): CacheStats {
    return { hits: 0, misses: 0, keys: 0, hitRate: 0 };
  }
}
