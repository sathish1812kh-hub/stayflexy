import type { IDistributedLock, LockResult } from "../types";
import { LOCK_PREFIX } from "../constants";

// Implements Redlock algorithm against a Redis client.
// Activate by: installing `redis` package and passing a connected client.
export class RedisLockProvider implements IDistributedLock {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly client: any) {}

  private buildKey(key: string): string {
    return `${LOCK_PREFIX}:${key}`;
  }

  async acquire(key: string, ttlMs: number, owner: string): Promise<LockResult> {
    const redisKey = this.buildKey(key);
    // NX = only set if not exists; PX = TTL in milliseconds
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = await this.client.set(redisKey, owner, { NX: true, PX: ttlMs }) as string | null;
    if (result === "OK") {
      return { acquired: true, key, owner, expiresAt: new Date(Date.now() + ttlMs) };
    }
    return { acquired: false, key, owner, expiresAt: null };
  }

  async release(key: string, owner: string): Promise<boolean> {
    // Lua script ensures atomic check-and-delete
    const script = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = await this.client.eval(script, { keys: [this.buildKey(key)], arguments: [owner] }) as number;
    return result === 1;
  }

  async extend(key: string, additionalMs: number, owner: string): Promise<boolean> {
    const script = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = await this.client.eval(script, { keys: [this.buildKey(key)], arguments: [owner, additionalMs.toString()] }) as number;
    return result === 1;
  }

  async isLocked(key: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = await this.client.exists(this.buildKey(key)) as number;
    return result > 0;
  }

  async getLockOwner(key: string): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.client.get(this.buildKey(key)) as Promise<string | null>;
  }
}
