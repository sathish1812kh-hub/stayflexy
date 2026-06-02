import Redis from 'ioredis'
import type { Request, Response, NextFunction } from 'express'

export function createRateLimitMiddleware(
  redis: Redis,
  windowMs: number,
  maxRequests: number
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const forwarded = req.headers['x-forwarded-for'] as string | undefined
    const ip =
      forwarded?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown'

    const window = Math.floor(Date.now() / windowMs)
    const key = `stayflexi:ratelimit:${ip}:${window}`

    try {
      const pipeline = redis.pipeline()
      pipeline.incr(key)
      pipeline.expire(key, Math.ceil(windowMs / 1000) + 1)
      const results = await pipeline.exec()
      const count = (results?.[0]?.[1] as number | undefined) ?? 1

      res.setHeader('x-ratelimit-limit', maxRequests)
      res.setHeader('x-ratelimit-remaining', Math.max(0, maxRequests - count))
      res.setHeader('x-ratelimit-reset', (window + 1) * windowMs)

      if (count > maxRequests) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            statusCode: 429,
          },
        })
        return
      }
      next()
    } catch {
      // Rate limiter failure must not block requests
      next()
    }
  }
}
