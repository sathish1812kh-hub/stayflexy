import type { Request, Response, NextFunction } from 'express'
import { isAppError } from '@stayflexi/shared-errors'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = req.headers['x-correlation-id'] as string | undefined

  if (isAppError(err)) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, statusCode: err.statusCode, details: err.details },
      correlationId,
    })
    return
  }

  // Validation errors from zod (statusCode on the error object)
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>
    if (typeof e['statusCode'] === 'number' && e['statusCode'] === 422) {
      res.status(422).json({
        success: false,
        error: { code: e['code'] ?? 'VALIDATION_ERROR', message: e['message'], statusCode: 422, details: e['details'] },
        correlationId,
      })
      return
    }
  }

  console.error('[booking-service] Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 },
    correlationId,
  })
}
