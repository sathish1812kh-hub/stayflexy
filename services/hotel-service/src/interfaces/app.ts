import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import { createRequestLogger } from '@stayflexi/shared-logger'
import { MetricsRegistry, createHttpMetricsMiddleware, createMetricsHandler } from '@stayflexi/shared-observability'
import { getPrismaClient } from '@stayflexi/shared-database'
import type Redis from 'ioredis'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'

import { correlationMiddleware } from '../middleware/correlation'
import { authMiddleware } from '../middleware/auth'
import { createRateLimiter } from '../middleware/rateLimit'
import { errorHandler } from '../middleware/errorHandler'
import { createHotelRouter } from './http/routes'
import { createHealthRouter } from './http/HealthController'
import { HotelController } from './http/HotelController'
import { schema } from './graphql/schema'
import {
  createRoomTypesByHotelIdLoader,
  createRoomsByHotelIdLoader,
  createRoomTypeLoader,
} from './graphql/dataloaders'

// Use cases
import { CreateHotel } from '../application/use-cases/CreateHotel'
import { GetHotel } from '../application/use-cases/GetHotel'
import { UpdateHotel } from '../application/use-cases/UpdateHotel'
import { ListHotels } from '../application/use-cases/ListHotels'
import { CreateRoomType } from '../application/use-cases/CreateRoomType'
import { GetRoomType } from '../application/use-cases/GetRoomType'
import { UpdateRoomType } from '../application/use-cases/UpdateRoomType'
import { ListRoomTypes } from '../application/use-cases/ListRoomTypes'
import { CreateRoom } from '../application/use-cases/CreateRoom'
import { GetRoom } from '../application/use-cases/GetRoom'
import { UpdateRoom } from '../application/use-cases/UpdateRoom'
import { UpdateRoomStatus } from '../application/use-cases/UpdateRoomStatus'
import { ListRooms } from '../application/use-cases/ListRooms'

// Application services
import { HotelCache } from '../application/services/HotelCache'
import { RoomTypeCache } from '../application/services/RoomTypeCache'
import { RoomCache } from '../application/services/RoomCache'

// Infrastructure
import { PrismaHotelRepository } from '../infrastructure/database/PrismaHotelRepository'
import { PrismaRoomTypeRepository } from '../infrastructure/database/PrismaRoomTypeRepository'
import { PrismaRoomRepository } from '../infrastructure/database/PrismaRoomRepository'

import type { HotelConfig } from '../config'

export function createApp(
  config: HotelConfig,
  redis: Redis,
  eventPublisher: IEventPublisher,
  logger: Logger
): express.Application {
  const db = getPrismaClient(config.DATABASE_URL)

  // Infrastructure
  const hotelRepo = new PrismaHotelRepository(db)
  const roomTypeRepo = new PrismaRoomTypeRepository(db)
  const roomRepo = new PrismaRoomRepository(db)

  // Caches
  const hotelCache = new HotelCache(redis, config.HOTEL_CACHE_TTL_SECONDS)
  const roomTypeCache = new RoomTypeCache(redis, config.HOTEL_CACHE_TTL_SECONDS)
  const roomCache = new RoomCache(redis, 60)

  // Use cases — hotels
  const createHotel = new CreateHotel(hotelRepo, eventPublisher, logger)
  const getHotel = new GetHotel(hotelRepo, hotelCache)
  const updateHotel = new UpdateHotel(hotelRepo, hotelCache, eventPublisher, logger)
  const listHotels = new ListHotels(hotelRepo)

  // Use cases — room types
  const createRoomType = new CreateRoomType(hotelRepo, roomTypeRepo, eventPublisher, logger)
  const getRoomType = new GetRoomType(roomTypeRepo, roomTypeCache)
  const updateRoomType = new UpdateRoomType(roomTypeRepo, roomTypeCache, eventPublisher, logger)
  const listRoomTypes = new ListRoomTypes(hotelRepo, roomTypeRepo)

  // Use cases — rooms
  const createRoom = new CreateRoom(hotelRepo, roomTypeRepo, roomRepo, eventPublisher, logger)
  const getRoom = new GetRoom(roomRepo, roomCache)
  const updateRoom = new UpdateRoom(roomRepo, roomTypeRepo, roomCache, eventPublisher, logger)
  const updateRoomStatus = new UpdateRoomStatus(
    hotelRepo,
    roomRepo,
    roomCache,
    eventPublisher,
    logger
  )
  const listRooms = new ListRooms(hotelRepo, roomRepo)

  // Controller
  const controller = new HotelController(
    createHotel,
    getHotel,
    updateHotel,
    listHotels,
    createRoomType,
    getRoomType,
    updateRoomType,
    listRoomTypes,
    createRoom,
    getRoom,
    updateRoom,
    updateRoomStatus,
    listRooms
  )

  // Express app
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(helmet({ hsts: { maxAge: 31536000, includeSubDomains: true } }))
  app.use(
    cors({
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Correlation-Id',
        'X-User-Id',
        'X-Organization-Id',
        'X-User-Role',
        'X-Service-Key',
      ],
    })
  )
  app.use(express.json({ limit: '5mb' }))
  const registry = new MetricsRegistry()
  app.use(correlationMiddleware)
  app.use(createRequestLogger(logger))
  app.use(createHttpMetricsMiddleware(registry) as unknown as express.RequestHandler)
  app.get('/metrics', createMetricsHandler(registry) as unknown as express.RequestHandler)
  app.use(createRateLimiter(config.RATE_LIMIT_WINDOW_MS, config.RATE_LIMIT_MAX_REQUESTS))

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/v1/')) return authMiddleware(req, res, next)
    return next()
  })

  app.use(createHealthRouter(db, redis))
  app.use(createHotelRouter(controller))

  const apolloServer = new ApolloServer({
    schema,
  })
  void apolloServer.start().then(() => {
    app.use(
      '/graphql',
      expressMiddleware(apolloServer, {
        context: async ({ req }) => {
          const userId = req.headers['x-user-id'] as string | undefined
          const orgId = req.headers['x-organization-id'] as string | undefined
          const role = req.headers['x-user-role'] as string | undefined
          const correlationId = req.headers['x-correlation-id'] as string | undefined

          return {
            userId: userId ?? null,
            organizationId: orgId ?? null,
            role: role ?? 'FRONT_DESK',
            correlationId,
            createHotel,
            getHotel,
            updateHotel,
            listHotels,
            createRoomType,
            getRoomType,
            updateRoomType,
            listRoomTypes,
            createRoom,
            getRoom,
            updateRoom,
            updateRoomStatus,
            listRooms,
            loaders: {
              roomTypesByHotelId: createRoomTypesByHotelIdLoader(db),
              roomsByHotelId: createRoomsByHotelIdLoader(db),
              roomType: createRoomTypeLoader(db),
            },
          }
        },
      })
    )
  })

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found', statusCode: 404 },
    })
  })

  app.use(errorHandler)
  return app
}
