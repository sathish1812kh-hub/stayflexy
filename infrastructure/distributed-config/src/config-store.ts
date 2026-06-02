import type { Redis } from 'ioredis';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfigEntry {
  value: string;
  version: number;
  updatedAt: string;
}

// ─── ConfigStore ──────────────────────────────────────────────────────────────

export class ConfigStore {
  private readonly HASH_KEY_PREFIX = 'stayflexi:config';
  private readonly localCache = new Map<
    string,
    { entry: ConfigEntry; expiresAt: number }
  >();
  private readonly CACHE_TTL_MS = 30_000;
  private readonly subscribers = new Map<
    string,
    Array<(value: string) => void>
  >();
  /** Dedicated subscriber client for Pub/Sub (separate from the main Redis client) */
  private subscriberClient: Redis | null = null;
  private subscriberReady = false;

  constructor(
    private readonly redis: Redis,
    /** Namespace for this service, e.g. 'booking-service' */
    private readonly namespace: string,
  ) {}

  // ── Private helpers ────────────────────────────────────────────────────────

  private get hashKey(): string {
    return `${this.HASH_KEY_PREFIX}:${this.namespace}`;
  }

  private changeChannel(key: string): string {
    return `config:changed:${this.namespace}:${key}`;
  }

  private cacheKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  // ── get ────────────────────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    const ck = this.cacheKey(key);
    const cached = this.localCache.get(ck);

    if (cached !== undefined && Date.now() < cached.expiresAt) {
      return cached.entry.value;
    }

    const raw = await this.redis.hget(this.hashKey, key);
    if (raw !== null) {
      const entry = JSON.parse(raw) as ConfigEntry;
      this.localCache.set(ck, {
        entry,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });
      return entry.value;
    }

    // Fallback: process.env
    const envValue = process.env[key.toUpperCase()];
    return envValue ?? null;
  }

  // ── set ────────────────────────────────────────────────────────────────────

  async set(key: string, value: string): Promise<void> {
    const existing = await this.redis.hget(this.hashKey, key);
    let version = 1;

    if (existing !== null) {
      const prev = JSON.parse(existing) as ConfigEntry;
      version = prev.version + 1;
    }

    const entry: ConfigEntry = {
      value,
      version,
      updatedAt: new Date().toISOString(),
    };

    await this.redis.hset(this.hashKey, key, JSON.stringify(entry));

    // Invalidate local cache
    this.localCache.delete(this.cacheKey(key));

    // Publish change notification
    await this.redis.publish(this.changeChannel(key), value);
  }

  // ── getAll ─────────────────────────────────────────────────────────────────

  async getAll(): Promise<Record<string, string>> {
    const raw = await this.redis.hgetall(this.hashKey);
    if (raw === null) return {};

    const result: Record<string, string> = {};
    for (const [key, rawEntry] of Object.entries(raw)) {
      if (rawEntry === undefined) continue;
      try {
        const entry = JSON.parse(rawEntry) as ConfigEntry;
        result[key] = entry.value;
      } catch {
        // Skip malformed entries
      }
    }
    return result;
  }

  // ── watch ──────────────────────────────────────────────────────────────────

  async watch(key: string, callback: (newValue: string) => void): Promise<void> {
    const channel = this.changeChannel(key);
    const ck = this.cacheKey(key);

    // Register callback
    const existing = this.subscribers.get(channel) ?? [];
    existing.push(callback);
    this.subscribers.set(channel, existing);

    // Lazily create the subscriber client
    if (this.subscriberClient === null) {
      this.subscriberClient = this.redis.duplicate();
      this.subscriberReady = false;

      this.subscriberClient.on('message', (ch: string, message: string) => {
        const callbacks = this.subscribers.get(ch) ?? [];
        // Invalidate local cache on change notification
        const keyFromChannel = ch.split(':').pop() ?? '';
        this.localCache.delete(this.cacheKey(keyFromChannel));

        for (const cb of callbacks) {
          cb(message);
        }
      });
    }

    if (!this.subscriberReady) {
      await new Promise<void>((resolve, reject) => {
        if (this.subscriberClient === null) {
          reject(new Error('Subscriber client not available'));
          return;
        }
        this.subscriberClient.once('ready', () => {
          this.subscriberReady = true;
          resolve();
        });
        this.subscriberClient.once('error', reject);
      });
    }

    await this.subscriberClient.subscribe(channel);

    // Invalidate cache when a subscription is set up
    this.localCache.delete(ck);
  }

  // ── refresh ────────────────────────────────────────────────────────────────

  refresh(): void {
    this.localCache.clear();
  }
}
