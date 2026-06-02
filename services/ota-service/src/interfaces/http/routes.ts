import { Router } from 'express'
import type { OtaController } from './OtaController'

export function createOtaApiRouter(controller: OtaController): Router {
  const router = Router()

  // ── Providers ─────────────────────────────────────────────────────────────
  router.get('/api/v1/ota/providers', controller.listProviders)
  router.post('/api/v1/ota/providers', controller.createProvider)
  router.get('/api/v1/ota/providers/:id', controller.getProvider)
  router.patch('/api/v1/ota/providers/:id/status', controller.updateProviderStatus)

  // ── OTA Connections ───────────────────────────────────────────────────────
  router.post('/api/v1/ota/connections', controller.createConnection)
  router.get('/api/v1/ota/connections', controller.listConnections)
  router.delete('/api/v1/ota/connections/:id', controller.deactivateConnection)

  // ── Sync Operations ───────────────────────────────────────────────────────
  router.post('/api/v1/ota/sync/inventory', controller.syncInventory)
  router.post('/api/v1/ota/sync/rates', controller.syncRates)
  router.post('/api/v1/ota/sync/reservations', controller.syncReservations)
  router.get('/api/v1/ota/sync/status', controller.getSyncStatus)

  // ── Reservations ──────────────────────────────────────────────────────────
  router.get('/api/v1/ota/reservations', controller.listReservations)
  router.post('/api/v1/ota/reservations/:id/import', controller.importReservation)

  // ── Reconciliation ────────────────────────────────────────────────────────
  router.get('/api/v1/ota/reconciliation', controller.getReconciliation)

  return router
}
