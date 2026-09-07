import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { HousekeepingController } from './HousekeepingController'

export function createHousekeepingRouter(controller: HousekeepingController): Router {
  const router = Router()

  router.post(
    '/api/v1/housekeeping/tasks',
    requirePermission('housekeeping', 'create'),
    controller.create,
  )
  router.get(
    '/api/v1/housekeeping/tasks',
    requirePermission('housekeeping', 'read'),
    controller.list,
  )
  router.get(
    '/api/v1/housekeeping/tasks/:id',
    requirePermission('housekeeping', 'read'),
    controller.getById,
  )
  router.patch(
    '/api/v1/housekeeping/tasks/:id',
    requirePermission('housekeeping', 'update'),
    controller.update,
  )
  router.patch(
    '/api/v1/housekeeping/tasks/:id/status',
    requirePermission('housekeeping', 'update'),
    controller.updateStatus,
  )
  router.post(
    '/api/v1/housekeeping/tasks/:id/assign',
    requirePermission('housekeeping', 'assign'),
    controller.assign,
  )
  router.delete(
    '/api/v1/housekeeping/tasks/:id',
    requirePermission('housekeeping', 'delete'),
    controller.delete,
  )

  return router
}
