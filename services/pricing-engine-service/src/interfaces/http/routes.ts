import { Router } from 'express'
import type { PricingController } from './PricingController'

export function createPricingApiRouter(controller: PricingController): Router {
  const router = Router()

  // Pricing rules
  router.post('/api/v1/pricing/rules', controller.createRule)
  router.get('/api/v1/pricing/rules', controller.listRules)

  // Rate computation
  router.post('/api/v1/pricing/compute', controller.computeRate)
  router.get('/api/v1/pricing/rates', controller.getRateRange)
  router.get('/api/v1/pricing/rates/:roomTypeId', controller.getRate)

  // Surge pricing
  router.post('/api/v1/pricing/surge', controller.applySurge)
  router.delete('/api/v1/pricing/surge', controller.removeSurge)

  // OTA synchronization
  router.post('/api/v1/pricing/ota-sync', controller.syncOta)

  return router
}
