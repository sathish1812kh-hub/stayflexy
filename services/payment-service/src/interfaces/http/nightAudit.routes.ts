import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { NightAuditController } from './NightAuditController'

export function createNightAuditRouter(controller: NightAuditController): Router {
  const router = Router()

  router.post('/api/v1/night-audits', requirePermission('audit', 'create'), controller.run)
  router.get('/api/v1/night-audits', requirePermission('audit', 'read'), controller.list)
  router.get('/api/v1/night-audits/:id', requirePermission('audit', 'read'), controller.getById)

  return router
}
