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

import type { NotificationConfig } from './config/index'
import { correlationMiddleware } from './middleware/correlation'
import { authMiddleware } from './middleware/auth'
import { createErrorHandler } from './middleware/errorHandler'
import { createNotificationApiRouter } from './interfaces/http/routes'
import { NotificationController } from './interfaces/http/NotificationController'

// Infrastructure & Use Cases
import { PrismaNotificationRepository } from './infrastructure/database/PrismaNotificationRepository'
import { PrismaTemplateRepository } from './infrastructure/database/PrismaTemplateRepository'
import { NotificationCache } from './infrastructure/cache/NotificationCache'
import { ProviderFactory } from './providers/ProviderFactory'
import { TemplateRenderer } from './templates/TemplateRenderer'

import { SendNotification } from './application/use-cases/SendNotification'
import { RetryNotification } from './application/use-cases/RetryNotification'
import { GetNotification } from './application/use-cases/GetNotification'
import { ListNotifications } from './application/use-cases/ListNotifications'

export function createApp(
  config: NotificationConfig,
  redis: Redis,
  eventPublisher: IEventPublisher,
  logger: Logger
): express.Application {
  const db = getPrismaClient(config.DATABASE_URL)

  // Infrastructure Instantiations
  const notificationRepo = new PrismaNotificationRepository(db)
  const templateRepo = new PrismaTemplateRepository(db)
  const cache = new NotificationCache(redis)
  const providerFactory = new ProviderFactory(logger)
  const templateRenderer = new TemplateRenderer()

  // Use Cases Instantiations
  const sendNotification = new SendNotification(notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger)
  const retryNotification = new RetryNotification(notificationRepo, providerFactory, logger)
  const getNotification = new GetNotification(notificationRepo)
  const listNotifications = new ListNotifications(notificationRepo)

  // Controller Instantiation
  const controller = new NotificationController(
    sendNotification,
    retryNotification,
    getNotification,
    listNotifications,
    templateRepo
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
    res.json({ status: 'alive', service: 'notification-service', uptime: Date.now() - startTime, timestamp: new Date().toISOString() })
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

  app.use(createNotificationApiRouter(controller))

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found', statusCode: 404 } })
  })
  app.use(createErrorHandler(logger))

  return app
}
