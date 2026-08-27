import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { FeeConfigController } from './FeeConfigController'

export function createFeeConfigRouter(controller: FeeConfigController): Router {
  const router = Router()

  router.post('/api/v1/fee-configs', requirePermission('fee_config', 'create'), controller.create)
  router.get('/api/v1/fee-configs', requirePermission('fee_config', 'read'), controller.list)
  router.get('/api/v1/fee-configs/:id', requirePermission('fee_config', 'read'), controller.getById)
  router.patch(
    '/api/v1/fee-configs/:id',
    requirePermission('fee_config', 'update'),
    controller.update,
  )
  router.delete(
    '/api/v1/fee-configs/:id',
    requirePermission('fee_config', 'delete'),
    controller.delete,
  )

  return router
}
