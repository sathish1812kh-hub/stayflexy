import type { Request, Response, NextFunction } from 'express'
import { UnauthorizedError, ForbiddenError } from '@stayflexi/shared-errors'
import { extractAuthUser } from '@stayflexi/shared-types'
import type { AuthUser } from '@stayflexi/shared-types'

// Extend Express Request to carry AuthUser
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/**
 * Authentication middleware for the payment-service.
 * Validates x-user-id + x-organization-id headers and sets req.user.
 * Also accepts service-to-service calls authenticated via x-service-key.
 */
export function authMiddleware(serviceKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = extractAuthUser(req.headers as Record<string, string | string[] | undefined>, serviceKey)

    if (!user) {
      const err = new UnauthorizedError(
        'Missing authentication headers: x-user-id and x-organization-id are required',
      )
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message, statusCode: err.statusCode },
      })
      return
    }

    req.user = user
    next()
  }
}

/**
 * Role-based authorization middleware.
 * Must be used after authMiddleware.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user
    if (!user) {
      const err = new UnauthorizedError('Authentication required')
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message, statusCode: err.statusCode },
      })
      return
    }

    // Service-to-service calls bypass role checks
    if (user.isServiceCall) {
      next()
      return
    }

    if (!roles.includes(user.primaryRole)) {
      const err = new ForbiddenError(
        `Insufficient permissions. Required: ${roles.join(' or ')}. Got: ${user.primaryRole}`,
      )
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message, statusCode: err.statusCode },
      })
      return
    }

    next()
  }
}
