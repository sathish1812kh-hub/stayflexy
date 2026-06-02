import { Router } from 'express'
import type { OrganizationController } from './OrganizationController'

export function createOrganizationRouter(controller: OrganizationController): Router {
  const router = Router()

  router.post('/api/v1/organizations', controller.create)
  router.get('/api/v1/organizations', controller.list)
  router.get('/api/v1/organizations/:id', controller.getById)
  router.patch('/api/v1/organizations/:id', controller.update)
  router.get('/api/v1/organizations/:id/members', controller.listMembers)
  router.post('/api/v1/organizations/:id/members', controller.addMember)
  router.patch('/api/v1/organizations/:id/members/:memberId', controller.patchMember)
  router.delete('/api/v1/organizations/:id/members/:memberId', controller.removeMember)

  return router
}
