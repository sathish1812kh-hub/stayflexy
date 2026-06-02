import type { ICacheProvider, CacheStats, CacheEntry } from "../types";

export class InMemoryCache implements ICacheProvider {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private readonly maxKeys: number;

  constructor(maxKeys = 10_000) {
    this.maxKeys = maxKeys;
    // Periodic cleanup every 60 seconds to evict expired entries
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.sweep(), 60_000).unref?.();
    }
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Convert glob pattern (* = any) to simple match
    const parts = pattern.split("*");
    if (parts.length === 1) return key === pattern;
    let pos = 0;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      const idx = key.indexOf(part, pos);
      if (idx === -1) return false;
      pos = idx + part.length;
    }
    return true;
  }

  private sweep(): void {
    for (const [key, entry] of this.store) {
      if (this.isExpired(entry)) this.store.delete(key);
    }
  }

  private evictIfNeeded(): void {
    if (this.store.size < this.maxKeys) return;
    // Evict oldest entry (first in Map insertion order)
    const firstKey = this.store.keys().next().value;
    if (firstKey !== undefined) this.store.delete(firstKey);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      if (entry) this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.evictIfNeeded();
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt, tags: [] });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (this.matchesPattern(key, pattern)) this.store.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) return false;
    return true;
  }

  async flush(): Promise<void> {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      keys: this.store.size,
      hitRate: total > 0 ? Math.round((this.hits / total) * 100) / 100 : 0,
    };
  }
}
