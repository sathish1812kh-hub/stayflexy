import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { GuestController } from './GuestController'

export function createGuestRouter(controller: GuestController): Router {
  const router = Router()

  router.post('/api/v1/guests', requirePermission('guest', 'create'), controller.create)
  router.get('/api/v1/guests', requirePermission('guest', 'read'), controller.list)
  router.get('/api/v1/guests/search', requirePermission('guest', 'read'), controller.list)
  router.get('/api/v1/guests/:id', requirePermission('guest', 'read'), controller.getById)
  router.patch('/api/v1/guests/:id', requirePermission('guest', 'update'), controller.update)
  router.delete('/api/v1/guests/:id', requirePermission('guest', 'delete'), controller.delete)
  router.post(
    '/api/v1/guests/find-or-create-by-email',
    requirePermission('guest', 'create'),
    controller.findOrCreateByEmail,
  )

  return router
}
