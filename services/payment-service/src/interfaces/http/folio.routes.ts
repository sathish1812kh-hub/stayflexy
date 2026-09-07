import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { FolioController } from './FolioController'

export function createFolioRouter(controller: FolioController): Router {
  const router = Router()

  router.post('/api/v1/folios', requirePermission('folio', 'create'), controller.create)
  router.get('/api/v1/folios', requirePermission('folio', 'read'), controller.list)
  router.get('/api/v1/folios/:id', requirePermission('folio', 'read'), controller.getById)
  router.get(
    '/api/v1/folios/:id/entries',
    requirePermission('folio', 'read'),
    controller.listEntries,
  )
  router.post(
    '/api/v1/folios/:id/entries',
    requirePermission('folio', 'charge'),
    controller.addEntry,
  )
  router.post('/api/v1/folios/:id/close', requirePermission('folio', 'update'), controller.close)
  router.post('/api/v1/folios/:id/void', requirePermission('folio', 'delete'), controller.void)

  return router
}
