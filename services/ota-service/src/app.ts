import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { getPrismaClient } from '@stayflexi/shared-database'
import { createRequestLogger } from '@stayflexi/shared-logger'
import type { Logger } from '@stayflexi/shared-logger'
import { MetricsRegistry, createHttpMetricsMiddleware, createMetricsHandler } from '@stayflexi/shared-observability'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type Redis from 'ioredis'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'

import type { OtaConfig } from './config/index'
import { correlationMiddleware } from './middleware/correlation'
import { authMiddleware } from './middleware/auth'
import { createErrorHandler } from './middleware/errorHandler'
import { createOtaApiRouter } from './interfaces/http/routes'
import { OtaController } from './interfaces/http/OtaController'
import { schema } from './interfaces/graphql/schema'

// Infrastructure & Use Cases
import { PrismaOtaProviderRepository } from './infrastructure/database/PrismaOtaProviderRepository'
import { PrismaOtaMappingRepository } from './infrastructure/database/PrismaOtaMappingRepository'
import { PrismaOtaReservationRepository } from './infrastructure/database/PrismaOtaReservationRepository'
import { PrismaSyncJobRepository } from './infrastructure/database/PrismaSyncJobRepository'
import { OtaSyncCache } from './infrastructure/cache/OtaSyncCache'
import { OtaDistributedLock } from './infrastructure/locking/OtaDistributedLock'
import { OtaEventPublisher } from './infrastructure/events/OtaEventPublisher'
import { AdapterFactory } from './adapters/AdapterFactory'
import { ReconciliationEngine } from './reconciliation/ReconciliationEngine'

import { ConnectOtaProvider } from './application/use-cases/ConnectOtaProvider'
import { SyncInventory } from './application/use-cases/SyncInventory'
import { SyncRates } from './application/use-cases/SyncRates'
import { SyncReservations } from './application/use-cases/SyncReservations'
import { ImportReservation } from './application/use-cases/ImportReservation'
import { GetSyncStatus } from './application/use-cases/GetSyncStatus'
import { GetReconciliation } from './application/use-cases/GetReconciliation'

export function createApp(
  config: OtaConfig,
  redis: Redis,
  eventPublisher: IEventPublisher,
  logger: Logger
): express.Application {
  const db = getPrismaClient(config.DATABASE_URL)

  // Infrastructure Instantiations
  const providerRepo = new PrismaOtaProviderRepository(db)
  const mappingRepo = new PrismaOtaMappingRepository(db)
  const reservationRepo = new PrismaOtaReservationRepository(db)
  const syncJobRepo = new PrismaSyncJobRepository(db)
  
  const cache = new OtaSyncCache(redis)
  const lock = new OtaDistributedLock(redis, logger)
  const otaEventPublisher = new OtaEventPublisher(eventPublisher, logger)
  const adapterFactory = new AdapterFactory(logger)
  const reconciliationEngine = new ReconciliationEngine(
    syncJobRepo,
    reservationRepo,
    mappingRepo,
    cache,
    logger
  )

  // Use Cases Instantiations
  const connectOta = new ConnectOtaProvider(providerRepo, mappingRepo, otaEventPublisher, logger)
  const syncInventory = new SyncInventory(providerRepo, mappingRepo, syncJobRepo, cache, lock, otaEventPublisher, adapterFactory, logger)
  const syncRates = new SyncRates(providerRepo, mappingRepo, syncJobRepo, cache, lock, otaEventPublisher, adapterFactory, logger)
  const syncReservations = new SyncReservations(providerRepo, mappingRepo, syncJobRepo, reservationRepo, cache, lock, otaEventPublisher, adapterFactory, logger)
  const importReservation = new ImportReservation(reservationRepo, otaEventPublisher, logger)
  const getSyncStatus = new GetSyncStatus(syncJobRepo, cache, logger)
  const getReconciliation = new GetReconciliation(reconciliationEngine, logger)

  // Controller Instantiation
  const controller = new OtaController(
    connectOta,
    syncInventory,
    syncRates,
    syncReservations,
    importReservation,
    getSyncStatus,
    getReconciliation,
    providerRepo,
    mappingRepo,
    reservationRepo
  )

  // Express Setup
  const registry = new MetricsRegistry()
  const app = express()
  
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id', 'X-User-Id', 'X-Organization-Id', 'X-User-Role', 'X-Service-Key'],
  }))
  app.use(express.json({ limit: '1mb' }))
  app.use(correlationMiddleware)
  app.use(createRequestLogger(logger))
  app.use(createHttpMetricsMiddleware(registry) as unknown as express.RequestHandler)
  app.get('/metrics', createMetricsHandler(registry) as unknown as express.RequestHandler)
  
  app.use(rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/health') || req.path === '/metrics',
  }))

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/v1/')) return authMiddleware(req, res, next)
    return next()
  })

  // Inline Health Router
  const startTime = Date.now()
  app.get('/health/live', (_req, res) => {
    res.json({ status: 'alive', service: 'ota-service', uptime: Date.now() - startTime, timestamp: new Date().toISOString() })
  })
  app.get('/health/ready', async (_req, res) => {
    const checks: Record<string, string> = {}
    let healthy = true
    try {
      await db.$queryRaw`SELECT 1`
      checks['database'] = 'ok'
    } catch {
      checks['database'] = 'error'
      healthy = false
    }
    try {
      await redis.ping()
      checks['redis'] = 'ok'
    } catch {
      checks['redis'] = 'error'
      healthy = false
    }
    res.status(healthy ? 200 : 503).json({ status: healthy ? 'ready' : 'not ready', checks })
  })

  app.use(createOtaApiRouter(controller))

  // GraphQL
  const apolloServer = new ApolloServer({ schema })
  void apolloServer.start().then(() => {
    app.use(
      '/graphql',
      expressMiddleware(apolloServer, {
        context: async ({ req }) => {
          return {
            userId: req.headers['x-user-id'] ?? null,
            organizationId: req.headers['x-organization-id'] ?? null,
            role: req.headers['x-user-role'] ?? 'FRONT_DESK',
            correlationId: req.headers['x-correlation-id'],
            connectOta,
            syncInventory,
            syncRates,
            syncReservations,
            importReservation,
            getSyncStatus,
            getReconciliation,
          }
        },
      })
    )
  })

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found', statusCode: 404 } })
  })
  app.use(createErrorHandler(logger))

  return app
}
