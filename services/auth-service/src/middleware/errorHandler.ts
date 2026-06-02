import type { Request, Response, NextFunction } from 'express'
import { isAppError } from '@stayflexi/shared-errors'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = req.headers['x-correlation-id'] as string | undefined

  if (isAppError(err)) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        details: err.details,
      },
      correlationId,
    })
    return
  }

  // Validation errors from shared-validation (statusCode 422 duck-type)
  if (
    typeof err === 'object' &&
    err !== null &&
    (err as Record<string, unknown>)['statusCode'] === 422
  ) {
    const e = err as {
      statusCode: number
      code: string
      message: string
      details?: unknown[]
    }
    res.status(422).json({
      success: false,
      error: {
        code: e.code,
        message: e.message,
        statusCode: 422,
        details: e.details,
      },
      correlationId,
    })
    return
  }

  console.error('[auth-service] Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred',
      statusCode: 500,
    },
    correlationId,
  })
}
