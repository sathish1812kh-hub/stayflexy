import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { CancellationPolicyController } from './CancellationPolicyController'

export function createCancellationPolicyRouter(controller: CancellationPolicyController): Router {
  const router = Router()

  router.post(
    '/api/v1/cancellation-policies',
    requirePermission('cancellation_policy', 'create'),
    controller.create,
  )
  router.get(
    '/api/v1/cancellation-policies',
    requirePermission('cancellation_policy', 'read'),
    controller.list,
  )
  router.get(
    '/api/v1/cancellation-policies/:id',
    requirePermission('cancellation_policy', 'read'),
    controller.getById,
  )
  router.patch(
    '/api/v1/cancellation-policies/:id',
    requirePermission('cancellation_policy', 'update'),
    controller.update,
  )
  router.delete(
    '/api/v1/cancellation-policies/:id',
    requirePermission('cancellation_policy', 'delete'),
    controller.delete,
  )
  router.post(
    '/api/v1/cancellation-policies/find-applicable',
    requirePermission('cancellation_policy', 'read'),
    controller.findApplicable,
  )

  return router
}
