import type { Request, Response, NextFunction } from 'express'
import type { IdempotencyStore } from '../infrastructure/idempotency/IdempotencyStore'

export function createIdempotencyMiddleware(store: IdempotencyStore) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only apply to POST requests (state-changing)
    if (req.method !== 'POST') { next(); return }

    const key = req.headers['idempotency-key'] as string | undefined
    if (!key) { next(); return }

    const existing = await store.get(key).catch(() => null)

    if (existing === 'PROCESSING') {
      res.status(409).json({
        success: false,
        error: { code: 'REQUEST_IN_PROGRESS', message: 'A request with this Idempotency-Key is already being processed', statusCode: 409 },
      })
      return
    }

    if (existing && existing !== 'PROCESSING') {
      res.setHeader('Idempotency-Replayed', 'true')
      res.status(existing.statusCode).json(existing.body)
      return
    }

    // Mark as processing
    const acquired = await store.markProcessing(key).catch(() => false)
    if (!acquired) {
      res.status(409).json({
        success: false,
        error: { code: 'REQUEST_IN_PROGRESS', message: 'Concurrent request with same Idempotency-Key', statusCode: 409 },
      })
      return
    }

    // Intercept response to store it
    const originalJson = res.json.bind(res)
    res.json = (body: unknown) => {
      store.store(key, { statusCode: res.statusCode, body, createdAt: new Date().toISOString() })
        .catch(() => undefined)
      return originalJson(body)
    }

    next()
  }
}
