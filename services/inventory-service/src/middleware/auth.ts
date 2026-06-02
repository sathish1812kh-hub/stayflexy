import type { Request, Response, NextFunction } from 'express'
import { UnauthorizedError, ForbiddenError } from '@stayflexi/shared-errors'
import type { AuthUser } from '@stayflexi/shared-types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id']
  const organizationId = req.headers['x-organization-id']
  const userRole = req.headers['x-user-role']
  const correlationId = req.headers['x-correlation-id']
  const serviceKey = req.headers['x-service-key']

  const configuredServiceKey = process.env['SERVICE_KEY']
  if (serviceKey && configuredServiceKey && serviceKey === configuredServiceKey) {
    req.user = {
      userId: 'service',
      organizationId: organizationId ? String(organizationId) : null,
      primaryRole: 'SERVICE',
      correlationId: String(correlationId ?? ''),
      isServiceCall: true,
    }
    next()
    return
  }

  if (!userId || !organizationId) {
    const err = new UnauthorizedError(
      'Missing authentication headers: x-user-id and x-organization-id are required',
    )
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, statusCode: err.statusCode },
    })
    return
  }

  req.user = {
    userId: String(userId),
    organizationId: String(organizationId),
    primaryRole: String(userRole ?? 'FRONT_DESK'),
    correlationId: String(correlationId ?? ''),
    isServiceCall: false,
  }
  next()
}

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

