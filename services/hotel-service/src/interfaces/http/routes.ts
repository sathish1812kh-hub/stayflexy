import { Router } from 'express'
import type { HotelController } from './HotelController'

export function createHotelRouter(controller: HotelController): Router {
  const router = Router()

  // Hotels
  router.post('/api/v1/hotels', controller.create)
  router.get('/api/v1/hotels', controller.list)
  router.get('/api/v1/hotels/:id', controller.getById)
  router.patch('/api/v1/hotels/:id', controller.update)

  // Room types (flat + nested listing)
  router.post('/api/v1/room-types', controller.createRoomType)
  router.get('/api/v1/room-types/:id', controller.getRoomTypeById)
  router.patch('/api/v1/room-types/:id', controller.updateRoomType)
  router.get('/api/v1/hotels/:hotelId/room-types', controller.listRoomTypes)

  // Rooms (flat + nested listing)
  router.post('/api/v1/rooms', controller.createRoom)
  router.get('/api/v1/rooms/:id', controller.getRoomById)
  router.patch('/api/v1/rooms/:id', controller.updateRoom)
  router.patch('/api/v1/rooms/:id/status', controller.updateRoomStatus)
  router.get('/api/v1/hotels/:hotelId/rooms', controller.listRooms)

  return router
}
