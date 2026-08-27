import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { TaxConfigController } from './TaxConfigController'

export function createTaxConfigRouter(controller: TaxConfigController): Router {
  const router = Router()

  // Calculation endpoint must be before :id to avoid shadowing
  router.post(
    '/api/v1/tax-configs/calculate',
    requirePermission('tax_config', 'read'),
    controller.calculate,
  )

  router.post('/api/v1/tax-configs', requirePermission('tax_config', 'create'), controller.create)
  router.get('/api/v1/tax-configs', requirePermission('tax_config', 'read'), controller.list)
  router.get('/api/v1/tax-configs/:id', requirePermission('tax_config', 'read'), controller.getById)
  router.patch(
    '/api/v1/tax-configs/:id',
    requirePermission('tax_config', 'update'),
    controller.update,
  )
  router.delete(
    '/api/v1/tax-configs/:id',
    requirePermission('tax_config', 'delete'),
    controller.delete,
  )

  return router
}
