import type { Request, Response, NextFunction } from 'express'
import { isAppError } from '@stayflexi/shared-errors'
import type { Logger } from '@stayflexi/shared-logger'

export function createErrorHandler(logger: Logger) {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const correlationId = req.headers['x-correlation-id'] as string | undefined

    if (isAppError(err)) {
      if (err.statusCode >= 500) {
        logger.error({ err, correlationId }, err.message)
      } else {
        logger.warn({ err, correlationId }, err.message)
      }
      res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          statusCode: err.statusCode,
          ...(err.details !== undefined && { details: err.details }),
        },
        correlationId,
      })
      return
    }

    // Validation errors from zod (thrown by validate())
    if (typeof err === 'object' && err !== null) {
      const e = err as Record<string, unknown>
      if (typeof e['statusCode'] === 'number' && e['statusCode'] === 422) {
        res.status(422).json({
          success: false,
          error: {
            code: String(e['code'] ?? 'VALIDATION_ERROR'),
            message: String(e['message'] ?? 'Validation failed'),
            statusCode: 422,
            ...(e['details'] !== undefined && { details: e['details'] }),
          },
          correlationId,
        })
        return
      }
    }

    logger.error({ err, correlationId }, 'Unhandled error in ota-service')
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', statusCode: 500 },
      correlationId,
    })
  }
}
