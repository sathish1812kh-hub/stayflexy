import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { OtaController } from './OtaController'

export function createOtaApiRouter(controller: OtaController): Router {
  const router = Router()

  // ── Providers ─────────────────────────────────────────────────────────────
  router.get('/api/v1/ota/providers', requirePermission('ota', 'read'), controller.listProviders)
  router.post(
    '/api/v1/ota/providers',
    requirePermission('ota', 'create'),
    controller.createProvider,
  )
  router.get('/api/v1/ota/providers/:id', requirePermission('ota', 'read'), controller.getProvider)
  router.patch(
    '/api/v1/ota/providers/:id',
    requirePermission('ota', 'update'),
    controller.updateProvider,
  )
  router.put(
    '/api/v1/ota/providers/:id',
    requirePermission('ota', 'update'),
    controller.updateProvider,
  )
  router.delete(
    '/api/v1/ota/providers/:id',
    requirePermission('ota', 'delete'),
    controller.deleteProvider,
  )
  router.patch(
    '/api/v1/ota/providers/:id/status',
    requirePermission('ota', 'update'),
    controller.updateProviderStatus,
  )

  // ── OTA Connections ───────────────────────────────────────────────────────
  router.post(
    '/api/v1/ota/connections',
    requirePermission('ota', 'create'),
    controller.createConnection,
  )
  router.get(
    '/api/v1/ota/connections',
    requirePermission('ota', 'read'),
    controller.listConnections,
  )
  router.get(
    '/api/v1/ota/connections/:id',
    requirePermission('ota', 'read'),
    controller.getConnection,
  )
  router.patch(
    '/api/v1/ota/connections/:id',
    requirePermission('ota', 'update'),
    controller.updateConnection,
  )
  router.put(
    '/api/v1/ota/connections/:id',
    requirePermission('ota', 'update'),
    controller.updateConnection,
  )
  router.delete(
    '/api/v1/ota/connections/:id',
    requirePermission('ota', 'delete'),
    controller.deactivateConnection,
  )

  // ── Sync Operations ───────────────────────────────────────────────────────
  router.post(
    '/api/v1/ota/sync/inventory',
    requirePermission('ota', 'create'),
    controller.syncInventory,
  )
  router.post('/api/v1/ota/sync/rates', requirePermission('ota', 'create'), controller.syncRates)
  router.post(
    '/api/v1/ota/sync/reservations',
    requirePermission('ota', 'create'),
    controller.syncReservations,
  )
  router.get('/api/v1/ota/sync/status', requirePermission('ota', 'read'), controller.getSyncStatus)

  // ── Reservations ──────────────────────────────────────────────────────────
  router.get(
    '/api/v1/ota/reservations',
    requirePermission('ota', 'read'),
    controller.listReservations,
  )
  router.post(
    '/api/v1/ota/reservations/:id/import',
    requirePermission('ota', 'update'),
    controller.importReservation,
  )

  // ── Reconciliation ────────────────────────────────────────────────────────
  router.get(
    '/api/v1/ota/reconciliation',
    requirePermission('ota', 'read'),
    controller.getReconciliation,
  )

  // ── Google Hotel Ads / Free Booking Links ARI Feed ────────────────────────
  router.get('/api/v1/ota/google-hotel-prices/:hotelId', controller.getGoogleHotelPricesFeed)
  router.post('/api/v1/ota/google-hotel-prices/:hotelId', controller.getGoogleHotelPricesFeed)

  return router
}
