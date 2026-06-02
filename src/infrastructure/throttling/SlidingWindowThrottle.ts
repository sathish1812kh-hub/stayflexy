// Sliding window rate limiter — more accurate than fixed windows.
// Production: back with Redis ZADD/ZRANGEBYSCORE for distributed enforcement.

export interface ThrottleResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch seconds
  retryAfter?: number; // seconds until next allowed request
}

interface WindowEntry {
  timestamps: number[]; // epoch ms of each request
}

export class SlidingWindowThrottle {
  private readonly windows = new Map<string, WindowEntry>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  check(key: string): ThrottleResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const entry = this.windows.get(key) ?? { timestamps: [] };

    // Evict requests outside the window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    const count = entry.timestamps.length;
    const allowed = count < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - count - (allowed ? 1 : 0));
    const resetAt = Math.ceil((now + this.windowMs) / 1000);

    if (allowed) {
      entry.timestamps.push(now);
      this.windows.set(key, entry);
    }

    const retryAfter = allowed
      ? undefined
      : entry.timestamps[0]
        ? Math.ceil((entry.timestamps[0] + this.windowMs - now) / 1000)
        : 1;

    return { allowed, remaining, resetAt, retryAfter };
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  stats(): { keys: number } {
    return { keys: this.windows.size };
  }
}

// Pre-configured throttlers for different API tiers
export const strictThrottle = new SlidingWindowThrottle(20, 60_000);   // 20/min
export const standardThrottle = new SlidingWindowThrottle(100, 60_000); // 100/min
export const relaxedThrottle = new SlidingWindowThrottle(500, 60_000);  // 500/min
