import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId: string
    }
  }
}

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId =
    (req.headers['x-correlation-id'] as string | undefined) ?? randomUUID()
  req.correlationId = correlationId
  res.setHeader('x-correlation-id', correlationId)
  next()
}
