import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

interface JwtPayload {
  sub: string
  organizationId?: string
  primaryRole: string
  iat: number
  exp: number
}

interface PublicRoute {
  method: string
  path: RegExp
}

// Public routes that do not require authentication
const PUBLIC_ROUTES: PublicRoute[] = [
  { method: 'POST', path: /^\/api\/v1\/auth\/register$/ },
  { method: 'POST', path: /^\/api\/v1\/auth\/login$/ },
  { method: 'POST', path: /^\/api\/v1\/auth\/refresh$/ },
  { method: 'GET', path: /^\/health/ },
  { method: 'GET', path: /^\/metrics$/ },
]

export function createAuthMiddleware(jwtSecret: string, serviceKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if route is public
    const isPublic = PUBLIC_ROUTES.some(
      (route) => req.method === route.method && route.path.test(req.path)
    )
    if (isPublic) {
      next()
      return
    }

    // Service-to-service calls via X-Service-Key header
    const serviceKeyHeader = req.headers['x-service-key']
    if (serviceKeyHeader === serviceKey) {
      next()
      return
    }

    // JWT validation
    const authHeader = req.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          statusCode: 401,
        },
      })
      return
    }

    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, jwtSecret) as JwtPayload
      // Inject user context headers for downstream services
      req.headers['x-user-id'] = payload.sub
      req.headers['x-user-role'] = payload.primaryRole
      if (payload.organizationId) {
        req.headers['x-organization-id'] = payload.organizationId
      }
      next()
    } catch (error) {
      const message =
        error instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token'
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message, statusCode: 401 },
      })
    }
  }
}
