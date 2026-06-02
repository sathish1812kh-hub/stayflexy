import helmet from 'helmet'
import cors from 'cors'
import type { RequestHandler } from 'express'

export function createSecurityMiddleware(allowedOrigins: string[]): RequestHandler[] {
  return [
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }),
    cors({
      origin: allowedOrigins.includes('*')
        ? '*'
        : (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true)
            } else {
              callback(new Error(`CORS blocked for origin: ${origin}`))
            }
          },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Correlation-Id',
        'X-Service-Key',
        'X-Request-Id',
      ],
      exposedHeaders: ['X-Correlation-Id', 'X-Response-Time', 'X-Request-Id'],
    }),
  ]
}
