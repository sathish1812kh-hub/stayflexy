// In-memory rate limiter preparation.
// Production: replace with Redis-backed sliding window (ioredis + rate-limiter-flexible).
import type { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@middleware/errorHandler";
import { TooManyRequestsError } from "@errors/HttpError";

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private readonly windows = new Map<string, RateLimitWindow>();

  check(
    key: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const existing = this.windows.get(key);

    if (!existing || now > existing.resetAt) {
      const resetAt = now + windowMs;
      this.windows.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: maxRequests - 1, resetAt };
    }

    existing.count++;
    const remaining = Math.max(0, maxRequests - existing.count);
    return { allowed: existing.count <= maxRequests, remaining, resetAt: existing.resetAt };
  }
}

const limiter = new InMemoryRateLimiter();

export function createRateLimitMiddleware(
  maxRequests = 100,
  windowMs = 60_000
) {
  return function rateLimitMiddleware(
    handler: (req: NextRequest) => Promise<NextResponse>
  ) {
    return async function (req: NextRequest): Promise<NextResponse> {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown";
      const key = `rl:${ip}`;
      const result = limiter.check(key, maxRequests, windowMs);

      if (!result.allowed) {
        return handleRouteError(new TooManyRequestsError("Too many requests — please try again later."));
      }

      const response = await handler(req);
      response.headers.set("X-RateLimit-Limit", maxRequests.toString());
      response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
      response.headers.set("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());
      return response;
    };
  };
}
