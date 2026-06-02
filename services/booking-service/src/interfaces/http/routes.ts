import { Router } from 'express'
import type { BookingController } from './BookingController'
import type { IdempotencyStore } from '../../infrastructure/idempotency/IdempotencyStore'
import { createIdempotencyMiddleware } from '../../middleware/idempotency'

export function createBookingRouter(controller: BookingController, idempotencyStore: IdempotencyStore): Router {
  const router = Router()
  const idempotency = createIdempotencyMiddleware(idempotencyStore)

  // Search routes (before :id to avoid conflict)
  router.get('/api/v1/bookings/search', controller.search)
  router.get('/api/v1/bookings', controller.list)

  // CRUD routes
  router.post('/api/v1/bookings', idempotency, controller.create)
  router.get('/api/v1/bookings/:id', controller.getById)
  router.patch('/api/v1/bookings/:id', controller.patch)

  // Lifecycle actions
  router.post('/api/v1/bookings/:id/cancel', controller.cancel)
  router.post('/api/v1/bookings/:id/check-in', controller.checkIn)
  router.post('/api/v1/bookings/:id/check-out', controller.checkOut)

  return router
}
