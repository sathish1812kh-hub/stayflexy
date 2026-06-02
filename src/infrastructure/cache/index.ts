export type { ICacheProvider, CacheStats, CacheOptions, CacheEntry } from "./types";
export { CACHE_TTL, CACHE_PREFIX } from "./constants";
export { CacheKeyBuilder } from "./strategies/CacheKeyBuilder";
export { InvalidationStrategy } from "./strategies/InvalidationStrategy";
export { InMemoryCache } from "./providers/InMemoryCache";
export { RedisCacheProvider } from "./providers/RedisCacheProvider";

import { InMemoryCache } from "./providers/InMemoryCache";
import { InvalidationStrategy } from "./strategies/InvalidationStrategy";

// Active cache provider — swap to RedisCacheProvider in production
export const cacheProvider = new InMemoryCache();
export const invalidationStrategy = new InvalidationStrategy(cacheProvider);
