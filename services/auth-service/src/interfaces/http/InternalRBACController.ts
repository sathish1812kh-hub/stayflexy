import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { successResponse } from '@stayflexi/shared-types'
import type { ManageRoles } from '../../application/use-cases/ManageRoles'

/**
 * Internal service-to-service endpoints. Guarded by the shared SERVICE_KEY;
 * never exposed through the gateway.
 */
export class InternalRBACController {
  constructor(
    private readonly manageRoles: ManageRoles,
    private readonly serviceKey: string,
  ) {}

  getUserPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = req.headers['x-service-key']
      if (!this.serviceKey || key !== this.serviceKey) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid x-service-key header',
            statusCode: 401,
          },
        })
        return
      }

      const userId = req.params['userId']!
      const organizationId = (req.query['organizationId'] as string | undefined) ?? null
      const hotelId = (req.query['hotelId'] as string | undefined) ?? null
      const correlationId = req.headers['x-correlation-id'] as string | undefined

      const permissions = await this.manageRoles.getUserPermissions(userId, organizationId, hotelId)

      const payload = correlationId
        ? successResponse({ permissions }, correlationId)
        : successResponse({ permissions })

      res.status(200).json(payload)
    } catch (err) {
      next(err)
    }
  }
}

export function createInternalRBACRouter(controller: InternalRBACController): Router {
  const router = Router()
  router.get('/internal/rbac/users/:userId/permissions', controller.getUserPermissions)
  return router
}
