import rateLimit from 'express-rate-limit'
import type { Request } from 'express'

export function createRateLimiter(
  windowMs: number = 15 * 60 * 1000,
  max: number = 500
): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.',
        statusCode: 429,
      },
    },
    skip: (req: Request) => req.path.startsWith('/health') || req.path === '/metrics',
  })
}
