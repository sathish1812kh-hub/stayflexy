import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { PromotionController } from './PromotionController'

export function createPromotionRouter(controller: PromotionController): Router {
  const router = Router()

  router.post('/api/v1/promotions', requirePermission('promotion', 'create'), controller.create)
  router.get('/api/v1/promotions', requirePermission('promotion', 'read'), controller.list)
  router.get('/api/v1/promotions/:id', requirePermission('promotion', 'read'), controller.getById)
  router.patch(
    '/api/v1/promotions/:id',
    requirePermission('promotion', 'update'),
    controller.update,
  )
  router.delete(
    '/api/v1/promotions/:id',
    requirePermission('promotion', 'delete'),
    controller.delete,
  )

  router.post(
    '/api/v1/promotions/redeem',
    requirePermission('promotion', 'redeem'),
    controller.redeem,
  )
  router.get(
    '/api/v1/promotions/:id/redemptions',
    requirePermission('promotion', 'read'),
    controller.listRedemptions,
  )

  return router
}
