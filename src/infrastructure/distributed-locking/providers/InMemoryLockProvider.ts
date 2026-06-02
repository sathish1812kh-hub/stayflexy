import type { IDistributedLock, LockResult, LockEntry } from "../types";

export class InMemoryLockProvider implements IDistributedLock {
  private readonly locks = new Map<string, LockEntry>();

  private isExpired(entry: LockEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  private clean(key: string): void {
    const entry = this.locks.get(key);
    if (entry && this.isExpired(entry)) this.locks.delete(key);
  }

  async acquire(key: string, ttlMs: number, owner: string): Promise<LockResult> {
    this.clean(key);
    const existing = this.locks.get(key);
    if (existing) {
      return { acquired: false, key, owner, expiresAt: null };
    }
    const expiresAt = Date.now() + ttlMs;
    this.locks.set(key, { owner, expiresAt });
    return { acquired: true, key, owner, expiresAt: new Date(expiresAt) };
  }

  async release(key: string, owner: string): Promise<boolean> {
    this.clean(key);
    const entry = this.locks.get(key);
    if (!entry || entry.owner !== owner) return false;
    this.locks.delete(key);
    return true;
  }

  async extend(key: string, additionalMs: number, owner: string): Promise<boolean> {
    const entry = this.locks.get(key);
    if (!entry || entry.owner !== owner || this.isExpired(entry)) return false;
    entry.expiresAt += additionalMs;
    return true;
  }

  async isLocked(key: string): Promise<boolean> {
    this.clean(key);
    return this.locks.has(key);
  }

  async getLockOwner(key: string): Promise<string | null> {
    this.clean(key);
    return this.locks.get(key)?.owner ?? null;
  }
}
