import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { PricingController } from './PricingController'

export function createPricingApiRouter(controller: PricingController): Router {
  const router = Router()

  // Pricing rules
  router.post(
    '/api/v1/pricing/rules',
    requirePermission('pricing', 'create'),
    controller.createRule,
  )
  router.get('/api/v1/pricing/rules', requirePermission('pricing', 'read'), controller.listRules)
  router.get('/api/v1/pricing/rules/:id', requirePermission('pricing', 'read'), controller.getRule)
  router.patch(
    '/api/v1/pricing/rules/:id',
    requirePermission('pricing', 'update'),
    controller.patchRule,
  )
  router.put(
    '/api/v1/pricing/rules/:id',
    requirePermission('pricing', 'update'),
    controller.patchRule,
  )
  router.delete(
    '/api/v1/pricing/rules/:id',
    requirePermission('pricing', 'delete'),
    controller.deleteRule,
  )

  // Rate computation
  router.post(
    '/api/v1/pricing/compute',
    requirePermission('pricing', 'create'),
    controller.computeRate,
  )
  router.get('/api/v1/pricing/rates', requirePermission('pricing', 'read'), controller.getRateRange)
  router.get(
    '/api/v1/pricing/rates/:roomTypeId',
    requirePermission('pricing', 'read'),
    controller.getRate,
  )

  // Surge pricing
  router.post(
    '/api/v1/pricing/surge',
    requirePermission('pricing', 'update'),
    controller.applySurge,
  )
  router.delete(
    '/api/v1/pricing/surge',
    requirePermission('pricing', 'delete'),
    controller.removeSurge,
  )

  // OTA synchronization
  router.post(
    '/api/v1/pricing/ota-sync',
    requirePermission('pricing', 'create'),
    controller.syncOta,
  )

  return router
}
