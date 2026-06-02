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
import type { RevenueManagementConfig } from './config/index'

import { correlationMiddleware } from './middleware/correlation'
import { authMiddleware } from './middleware/auth'
import { createErrorHandler } from './middleware/errorHandler'
import { createHealthRouter } from './health'
import { createRevenueApiRouter } from './interfaces/http/routes'
import { RevenueController } from './interfaces/http/RevenueController'

import { PrismaForecastRepository } from './infrastructure/database/PrismaForecastRepository'
import { PrismaRateRecommendationRepository } from './infrastructure/database/PrismaRateRecommendationRepository'
import { PrismaRevenueTargetRepository } from './infrastructure/database/PrismaRevenueTargetRepository'
import { RevenueCache } from './infrastructure/cache/RevenueCache'

import { GenerateForecast } from './application/use-cases/GenerateForecast'
import { GetRateRecommendation } from './application/use-cases/GetRateRecommendation'
import { CreateRevenueTarget } from './application/use-cases/CreateRevenueTarget'
import { GetRevenuePerformance } from './application/use-cases/GetRevenuePerformance'

export function createApp(
  config: RevenueManagementConfig,
  redis: Redis,
  eventPublisher: IEventPublisher,
  logger: Logger,
): express.Application {
  const db = getPrismaClient(config.DATABASE_URL)
  const cache = new RevenueCache(redis)
  const forecastRepo = new PrismaForecastRepository(db)
  const recommendationRepo = new PrismaRateRecommendationRepository(db)
  const targetRepo = new PrismaRevenueTargetRepository(db)

  const generateForecast = new GenerateForecast(forecastRepo, cache, eventPublisher, logger, config.FORECAST_HORIZON_DAYS)
  const getRateRecommendation = new GetRateRecommendation(
    recommendationRepo, forecastRepo, targetRepo, cache, eventPublisher, logger,
  )
  const createRevenueTarget = new CreateRevenueTarget(targetRepo, eventPublisher, logger)
  const getRevenuePerformance = new GetRevenuePerformance(targetRepo)

  const controller = new RevenueController(
    generateForecast, getRateRecommendation, createRevenueTarget, getRevenuePerformance,
  )

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
  app.use(express.json({ limit: '2mb' }))
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

  app.use(createHealthRouter(db, redis))
  app.use(createRevenueApiRouter(controller))

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found', statusCode: 404 } })
  })
  app.use(createErrorHandler(logger))

  return app
}
