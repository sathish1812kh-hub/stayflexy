import type { Request, Response, NextFunction } from 'express'
import type { PaymentIdempotencyStore } from '../infrastructure/idempotency/PaymentIdempotencyStore'

// Wraps response.json to intercept and cache the response body for idempotency
export function idempotencyMiddleware(store: PaymentIdempotencyStore) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.headers['idempotency-key'] as string | undefined
    if (!key) {
      next()
      return
    }

    const existing = await store.get(key).catch(() => null)

    if (existing === 'PROCESSING') {
      res.status(409).json({
        success: false,
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'A request with this Idempotency-Key is already being processed',
          statusCode: 409,
        },
        correlationId: req.headers['x-correlation-id'] as string | undefined,
      })
      return
    }

    if (existing !== null) {
      res.status(existing.statusCode).json(existing.body)
      return
    }

    // Mark as processing (60s lock to prevent concurrent duplicate submissions)
    const claimed = await store.markProcessing(key).catch(() => false)
    if (!claimed) {
      res.status(409).json({
        success: false,
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'A request with this Idempotency-Key is already being processed',
          statusCode: 409,
        },
        correlationId: req.headers['x-correlation-id'] as string | undefined,
      })
      return
    }

    // Intercept res.json to cache the result
    const originalJson = res.json.bind(res)
    res.json = (body: unknown) => {
      const statusCode = res.statusCode
      // Only cache successful responses (2xx) or known errors — not 5xx
      if (statusCode < 500) {
        store.store(key, { statusCode, body, createdAt: new Date().toISOString() })
          .catch(() => undefined)
      } else {
        // Delete the processing lock on error so caller can retry
        store.delete(key).catch(() => undefined)
      }
      return originalJson(body)
    }

    next()
  }
}
