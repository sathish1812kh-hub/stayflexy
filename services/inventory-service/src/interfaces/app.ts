import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { schema } from './graphql/schema'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import { createRequestLogger } from '@stayflexi/shared-logger'
import { MetricsRegistry, createHttpMetricsMiddleware, createMetricsHandler } from '@stayflexi/shared-observability'
import { getPrismaClient } from '@stayflexi/shared-database'
import type Redis from 'ioredis'

import { correlationMiddleware } from '../middleware/correlation'
import { authMiddleware } from '../middleware/auth'
import { createRateLimiter } from '../middleware/rateLimit'
import { errorHandler } from '../middleware/errorHandler'
import { createInventoryRouter } from './http/routes'
import { createHealthRouter } from './http/HealthController'
import { InventoryController } from './http/InventoryController'

// Use cases
import { ReserveInventory } from '../application/use-cases/ReserveInventory'
import { ReleaseInventory } from '../application/use-cases/ReleaseInventory'
import { BlockInventory } from '../application/use-cases/BlockInventory'
import { UnblockInventory } from '../application/use-cases/UnblockInventory'
import { CheckAvailability } from '../application/use-cases/CheckAvailability'
import { GetAvailabilityCalendar } from '../application/use-cases/GetAvailabilityCalendar'

// Application services
import { DistributedLockService } from '../application/services/DistributedLockService'
import { InventoryCache } from '../application/services/InventoryCache'

// Infrastructure
import { PrismaInventoryRepository } from '../infrastructure/database/PrismaInventoryRepository'
import { PrismaInventoryReservationRepository } from '../infrastructure/database/PrismaInventoryReservationRepository'
import { PrismaInventoryBlockRepository } from '../infrastructure/database/PrismaInventoryBlockRepository'

import type { InventoryConfig } from '../config'

export function createApp(
  config: InventoryConfig,
  redis: Redis,
  eventPublisher: IEventPublisher,
  logger: Logger
): express.Application {
  const db = getPrismaClient(config.DATABASE_URL)

  // Infrastructure
  const inventoryRepo = new PrismaInventoryRepository(db)
  const reservationRepo = new PrismaInventoryReservationRepository(db)
  const blockRepo = new PrismaInventoryBlockRepository(db)

  // Application services
  const lockService = new DistributedLockService(
    redis,
    logger,
    config.LOCK_TTL_MS,
    config.LOCK_RETRY_ATTEMPTS
  )
  const cache = new InventoryCache(redis, config.INVENTORY_CACHE_TTL_SECONDS)

  // Use cases
  const reserveInventory = new ReserveInventory(
    inventoryRepo,
    lockService,
    cache,
    eventPublisher,
    logger
  )
  const releaseInventory = new ReleaseInventory(reservationRepo, eventPublisher, logger)
  const blockInventory = new BlockInventory(
    inventoryRepo,
    blockRepo,
    lockService,
    cache,
    eventPublisher,
    logger
  )
  const unblockInventory = new UnblockInventory(
    inventoryRepo,
    blockRepo,
    lockService,
    cache,
    eventPublisher,
    logger
  )
  const checkAvailability = new CheckAvailability(inventoryRepo)
  const getCalendar = new GetAvailabilityCalendar(inventoryRepo)

  // Controller
  const controller = new InventoryController(
    reserveInventory,
    releaseInventory,
    blockInventory,
    unblockInventory,
    checkAvailability,
    getCalendar
  )

  // Express app
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(helmet({ hsts: { maxAge: 31536000, includeSubDomains: true } }))
  app.use(
    cors({
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
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
  app.use(express.json({ limit: '1mb' }))
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
  app.use(createInventoryRouter(controller))

  // Mount Apollo Server Federated GraphQL Middleware
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
            reserveInventory,
            releaseInventory,
            blockInventory,
            unblockInventory,
            checkAvailability,
            getAvailabilityCalendar: getCalendar,
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
