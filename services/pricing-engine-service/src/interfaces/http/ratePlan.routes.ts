import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { RatePlanController } from './RatePlanController'

export function createRatePlanRouter(controller: RatePlanController): Router {
  const router = Router()

  // RatePlan
  router.post('/api/v1/rate-plans', requirePermission('rate_plan', 'create'), controller.create)
  router.get('/api/v1/rate-plans', requirePermission('rate_plan', 'read'), controller.list)
  router.get('/api/v1/rate-plans/:id', requirePermission('rate_plan', 'read'), controller.getById)
  router.patch(
    '/api/v1/rate-plans/:id',
    requirePermission('rate_plan', 'update'),
    controller.update,
  )
  router.delete(
    '/api/v1/rate-plans/:id',
    requirePermission('rate_plan', 'delete'),
    controller.delete,
  )

  // Season
  router.post('/api/v1/seasons', requirePermission('rate_plan', 'create'), controller.createSeason)
  router.get('/api/v1/seasons', requirePermission('rate_plan', 'read'), controller.listSeasons)
  router.get(
    '/api/v1/seasons/:id',
    requirePermission('rate_plan', 'read'),
    controller.getSeasonById,
  )
  router.patch(
    '/api/v1/seasons/:id',
    requirePermission('rate_plan', 'update'),
    controller.updateSeason,
  )
  router.delete(
    '/api/v1/seasons/:id',
    requirePermission('rate_plan', 'delete'),
    controller.deleteSeason,
  )

  // Restriction
  router.post(
    '/api/v1/restrictions',
    requirePermission('rate_plan', 'create'),
    controller.createRestriction,
  )
  router.get(
    '/api/v1/restrictions',
    requirePermission('rate_plan', 'read'),
    controller.listRestrictions,
  )
  router.get(
    '/api/v1/restrictions/:id',
    requirePermission('rate_plan', 'read'),
    controller.getRestrictionById,
  )
  router.patch(
    '/api/v1/restrictions/:id',
    requirePermission('rate_plan', 'update'),
    controller.updateRestriction,
  )
  router.delete(
    '/api/v1/restrictions/:id',
    requirePermission('rate_plan', 'delete'),
    controller.deleteRestriction,
  )

  return router
}
