import type { Request, Response, NextFunction } from 'express'
import type { Logger } from '@stayflexi/shared-logger'
import { BaseError } from '@stayflexi/shared-errors'

export function createErrorHandler(logger: Logger) {
  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof BaseError) {
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message, statusCode: err.statusCode },
      })
      return
    }
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error')
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred', statusCode: 500 },
    })
  }
}
