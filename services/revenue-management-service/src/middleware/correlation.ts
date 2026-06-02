import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'

export function correlationMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.headers['x-correlation-id']) {
    req.headers['x-correlation-id'] = randomUUID()
  }
  next()
}
