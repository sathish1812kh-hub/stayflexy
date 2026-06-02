import type { ServiceRegistry } from './registry';

// ─── Cache entry ──────────────────────────────────────────────────────────────

interface CacheEntry {
  urls: string[];
  cachedAt: number;
  /** Round-robin cursor */
  index: number;
}

// ─── ServiceDiscoveryClient ───────────────────────────────────────────────────

export class ServiceDiscoveryClient {
  private readonly urlCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5_000;

  constructor(
    private readonly registry?: ServiceRegistry,
    private readonly envPrefix = 'SERVICE',
  ) {}

  // ── discover ───────────────────────────────────────────────────────────────

  async discover(serviceName: string): Promise<string> {
    // Try the local cache first
    const cached = this.urlCache.get(serviceName);
    const now = Date.now();

    if (cached !== undefined && now - cached.cachedAt < this.CACHE_TTL_MS) {
      const url = cached.urls[cached.index % cached.urls.length];
      cached.index = (cached.index + 1) % cached.urls.length;
      if (url !== undefined) return url;
    }

    // Try the registry if available
    if (this.registry !== undefined) {
      try {
        const instances = await this.registry.getInstances(serviceName);
        if (instances.length > 0) {
          const urls = instances.map((i) => i.url);
          const entry: CacheEntry = { urls, cachedAt: now, index: 1 };
          this.urlCache.set(serviceName, entry);
          const url = urls[0];
          if (url !== undefined) return url;
        }
      } catch {
        // Fall through to env-var fallback
      }
    }

    // Environment variable fallback
    const envUrl = this.getEnvFallback(serviceName);
    if (envUrl !== undefined) {
      const entry: CacheEntry = { urls: [envUrl], cachedAt: now, index: 0 };
      this.urlCache.set(serviceName, entry);
      return envUrl;
    }

    throw new Error(
      `Service "${serviceName}" is not registered and no environment variable fallback found. ` +
        `Expected: ${this.envPrefix}_${serviceName.toUpperCase().replace(/-/g, '_')}_URL`,
    );
  }

  // ── getEnvFallback ─────────────────────────────────────────────────────────

  private getEnvFallback(serviceName: string): string | undefined {
    const varName = `${this.envPrefix}_${serviceName
      .toUpperCase()
      .replace(/-/g, '_')}_URL`;
    return process.env[varName];
  }

  // ── Static factory ─────────────────────────────────────────────────────────

  static envBased(): ServiceDiscoveryClient {
    return new ServiceDiscoveryClient(undefined);
  }
}
