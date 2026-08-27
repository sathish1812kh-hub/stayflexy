import { Router } from 'express'
import { requirePermission } from '@stayflexi/shared-auth'
import type { BookingController } from './BookingController'
import type { IdempotencyStore } from '../../infrastructure/idempotency/IdempotencyStore'
import { createIdempotencyMiddleware } from '../../middleware/idempotency'

// Permission enforcement (pilot for the RBAC rollout).
// Guards run AFTER the app-level authMiddleware has populated req.user;
// service-to-service calls and SUPER_ADMIN bypass in requirePermission.
export function createBookingRouter(
  controller: BookingController,
  idempotencyStore: IdempotencyStore,
): Router {
  const router = Router()
  const idempotency = createIdempotencyMiddleware(idempotencyStore)

  // Search routes (before :id to avoid conflict)
  router.get('/api/v1/bookings/search', requirePermission('booking', 'read'), controller.search)
  router.get('/api/v1/bookings', requirePermission('booking', 'read'), controller.list)

  // CRUD routes
  router.post(
    '/api/v1/bookings',
    idempotency,
    requirePermission('booking', 'create'),
    controller.create,
  )
  router.get('/api/v1/bookings/:id', requirePermission('booking', 'read'), controller.getById)
  router.patch('/api/v1/bookings/:id', requirePermission('booking', 'update'), controller.patch)

  // Lifecycle actions
  router.post(
    '/api/v1/bookings/:id/cancel',
    requirePermission('booking', 'cancel'),
    controller.cancel,
  )
  router.post(
    '/api/v1/bookings/:id/check-in',
    requirePermission('booking', 'update'),
    controller.checkIn,
  )
  router.post(
    '/api/v1/bookings/:id/check-out',
    requirePermission('booking', 'update'),
    controller.checkOut,
  )

  return router
}
