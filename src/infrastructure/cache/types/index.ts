export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<void>; // wildcard invalidation
  exists(key: string): Promise<boolean>;
  flush(): Promise<void>;
  stats(): CacheStats;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  hitRate: number;
}

export interface CacheOptions {
  ttlSeconds?: number;
  tags?: string[]; // for group invalidation
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number | null; // epoch ms, null = no expiry
  tags: string[];
}
