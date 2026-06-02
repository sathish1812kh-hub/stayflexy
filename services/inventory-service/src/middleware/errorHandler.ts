import type { Request, Response, NextFunction } from 'express'
import { isAppError } from '@stayflexi/shared-errors'

interface ValidationErrorLike extends Error {
  statusCode: number
  code: string
  details?: Array<{ field: string; message: string }>
}

function isValidationError(err: unknown): err is ValidationErrorLike {
  return (
    typeof err === 'object' &&
    err !== null &&
    err instanceof Error &&
    'statusCode' in err &&
    'code' in err
  )
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = req.correlationId ?? 'unknown'

  if (isAppError(err)) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        ...(err.details ? { details: err.details } : {}),
      },
      correlationId,
    })
    return
  }

  if (isValidationError(err) && err.code === 'VALIDATION_ERROR') {
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

  const statusCode = 500
  const message =
    process.env['NODE_ENV'] === 'production'
      ? 'An unexpected error occurred'
      : err instanceof Error
      ? err.message
      : String(err)

  res.status(statusCode).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message, statusCode },
    correlationId,
  })
}
