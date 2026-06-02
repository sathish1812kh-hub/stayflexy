import { Router } from 'express'
import type { InventoryController } from './InventoryController'

export function createInventoryRouter(controller: InventoryController): Router {
  const router = Router()

  router.post('/api/v1/inventory/reserve', controller.reserve)
  router.post('/api/v1/inventory/release', controller.release)
  router.post('/api/v1/inventory/block', controller.block)
  router.post('/api/v1/inventory/unblock', controller.unblock)
  router.get('/api/v1/inventory/availability', controller.checkAvailability)
  router.get('/api/v1/inventory/calendar', controller.getCalendar)

  return router
}
