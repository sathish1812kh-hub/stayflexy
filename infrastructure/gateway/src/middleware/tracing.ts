import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'

export function tracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId =
    (req.headers['x-correlation-id'] as string | undefined) ?? randomUUID()

  // Normalize and propagate
  req.headers['x-correlation-id'] = correlationId
  res.setHeader('x-correlation-id', correlationId)
  res.setHeader('x-request-id', randomUUID())

  // Add request timing
  const startTime = Date.now()
  res.on('finish', () => {
    res.setHeader('x-response-time', `${Date.now() - startTime}ms`)
  })

  next()
}
