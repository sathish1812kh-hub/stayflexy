import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { schema } from './graphql/schema'
import { createRequestLogger } from '@stayflexi/shared-logger'
import {
  MetricsRegistry,
  createHttpMetricsMiddleware,
  createMetricsHandler,
} from '@stayflexi/shared-observability'
import { createEventPublisher } from '@stayflexi/shared-events'
import { getPrismaClient } from '@stayflexi/shared-database'
import type { Logger } from '@stayflexi/shared-logger'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type Redis from 'ioredis'
import type { BookingConfig } from '../config'

import { correlationMiddleware } from '../middleware/correlation'
import { authMiddleware } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { createHealthRouter } from './http/HealthController'
import { createBookingRouter } from './http/routes'
import { createCancellationPolicyRouter } from './http/cancellationPolicy.routes'
import { BookingController } from './http/BookingController'
import { CancellationPolicyController } from './http/CancellationPolicyController'

// Use cases
import { CreateBooking } from '../application/use-cases/CreateBooking'
import { GetBooking } from '../application/use-cases/GetBooking'
import { CancelBooking } from '../application/use-cases/CancelBooking'
import { CheckIn } from '../application/use-cases/CheckIn'
import { CheckOut } from '../application/use-cases/CheckOut'
import { SearchBookings } from '../application/use-cases/SearchBookings'
import { PatchBooking } from '../application/use-cases/PatchBooking'
import { CreateCancellationPolicy } from '../application/use-cases/CreateCancellationPolicy'
import { GetCancellationPolicy } from '../application/use-cases/GetCancellationPolicy'
import { UpdateCancellationPolicy } from '../application/use-cases/UpdateCancellationPolicy'
import { DeleteCancellationPolicy } from '../application/use-cases/DeleteCancellationPolicy'
import { ListCancellationPolicies } from '../application/use-cases/ListCancellationPolicies'
import { FindApplicableCancellationPolicy } from '../application/use-cases/FindApplicableCancellationPolicy'

// Infrastructure
import { PrismaBookingRepository } from '../infrastructure/database/PrismaBookingRepository'
import { PrismaInventoryRepository } from '../infrastructure/database/PrismaInventoryRepository'
import { PrismaCancellationPolicyRepository } from '../infrastructure/database/PrismaCancellationPolicyRepository'
import { BookingCache } from '../infrastructure/cache/BookingCache'
import { IdempotencyStore } from '../infrastructure/idempotency/IdempotencyStore'
import { RedisDistributedLock } from '../infrastructure/locking/RedisDistributedLock'

export function createApp(
  config: BookingConfig,
  redis: Redis,
  eventPublisher: IEventPublisher,
  logger: Logger,
): express.Application {
  const db = getPrismaClient(config.DATABASE_URL)

  // Infrastructure
  const bookingRepo = new PrismaBookingRepository(db)
  const inventoryRepo = new PrismaInventoryRepository(db)
  const policyRepo = new PrismaCancellationPolicyRepository(db)
  const cache = new BookingCache(redis, config.BOOKING_CACHE_TTL_SECONDS)
  const idempotencyStore = new IdempotencyStore(redis, config.IDEMPOTENCY_TTL_SECONDS)
  const lock = new RedisDistributedLock(
    redis,
    config.BOOKING_LOCK_TTL_MS,
    config.BOOKING_LOCK_RETRY_COUNT,
    config.BOOKING_LOCK_RETRY_DELAY_MS,
  )

  // Cancellation Policy use cases
  const createPolicy = new CreateCancellationPolicy(policyRepo, logger)
  const getPolicy = new GetCancellationPolicy(policyRepo, logger)
  const updatePolicy = new UpdateCancellationPolicy(policyRepo, logger)
  const deletePolicy = new DeleteCancellationPolicy(policyRepo, logger)
  const listPolicies = new ListCancellationPolicies(policyRepo, logger)
  const findApplicablePolicy = new FindApplicableCancellationPolicy(policyRepo, logger)

  // Use cases
  const createBooking = new CreateBooking(bookingRepo, inventoryRepo, lock, eventPublisher, logger)
  const getBooking = new GetBooking(bookingRepo, cache)
  const cancelBooking = new CancelBooking(
    bookingRepo,
    inventoryRepo,
    cache,
    eventPublisher,
    logger,
    findApplicablePolicy,
  )
  const checkIn = new CheckIn(bookingRepo, cache, eventPublisher, logger)
  const checkOut = new CheckOut(bookingRepo, cache, eventPublisher, logger)
  const searchBookings = new SearchBookings(bookingRepo)
  const patchBooking = new PatchBooking(bookingRepo, cache, logger)

  // Controllers
  const controller = new BookingController(
    createBooking,
    getBooking,
    cancelBooking,
    checkIn,
    checkOut,
    searchBookings,
    patchBooking,
    config,
  )
  const policyController = new CancellationPolicyController(
    createPolicy,
    getPolicy,
    updatePolicy,
    deletePolicy,
    listPolicies,
    findApplicablePolicy,
    config,
  )

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(
    cors({
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'Idempotency-Key'],
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  const registry = new MetricsRegistry()
  app.use(correlationMiddleware)
  app.use(createRequestLogger(logger))
  app.use(createHttpMetricsMiddleware(registry) as unknown as express.RequestHandler)
  app.get('/metrics', createMetricsHandler(registry) as unknown as express.RequestHandler)
  app.use(
    rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path.startsWith('/health') || req.path === '/metrics',
    }),
  )

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/v1/')) return authMiddleware(req, res, next)
    return next()
  })

  app.use(createHealthRouter(db, redis))
  app.use(createBookingRouter(controller, idempotencyStore))
  app.use(createCancellationPolicyRouter(policyController))

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
            createBooking,
            checkIn,
            checkOut,
            cancelBooking,
            getBooking,
            searchBookings,
          }
        },
      }),
    )
  })

  app.use((req, res, next) => {
    if (req.path === '/graphql') {
      return next()
    }
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found', statusCode: 404 },
    })
  })
  app.use(errorHandler)

  return app
}
