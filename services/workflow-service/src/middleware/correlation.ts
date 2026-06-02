import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const existing = req.headers['x-correlation-id'] as string | undefined
  const id = existing ?? randomUUID()
  req.headers['x-correlation-id'] = id
  res.setHeader('x-correlation-id', id)
  next()
}
