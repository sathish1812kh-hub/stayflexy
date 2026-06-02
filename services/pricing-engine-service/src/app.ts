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
import type { PricingEngineConfig } from './config/index'

import { correlationMiddleware } from './middleware/correlation'
import { authMiddleware } from './middleware/auth'
import { createErrorHandler } from './middleware/errorHandler'
import { createHealthRouter } from './health'
import { createPricingApiRouter } from './interfaces/http/routes'
import { PricingController } from './interfaces/http/PricingController'

import { PrismaPricingRuleRepository } from './infrastructure/database/PrismaPricingRuleRepository'
import { PrismaDynamicRateRepository } from './infrastructure/database/PrismaDynamicRateRepository'
import { PricingCache } from './infrastructure/cache/PricingCache'
import { SurgePricingController } from './engine/SurgePricingController'

import { CreatePricingRule } from './application/use-cases/CreatePricingRule'
import { ComputeDynamicRate } from './application/use-cases/ComputeDynamicRate'
import { GetCurrentRate } from './application/use-cases/GetCurrentRate'
import { ApplySurgePricing } from './application/use-cases/ApplySurgePricing'
import { ListPricingRules } from './application/use-cases/ListPricingRules'
import { SyncOtaRates } from './application/use-cases/SyncOtaRates'

export function createApp(
  config: PricingEngineConfig,
  redis: Redis,
  eventPublisher: IEventPublisher,
  logger: Logger,
): express.Application {
  const db = getPrismaClient(config.DATABASE_URL)
  const cache = new PricingCache(redis)
  const ruleRepo = new PrismaPricingRuleRepository(db)
  const rateRepo = new PrismaDynamicRateRepository(db)
  const surgeController = new SurgePricingController(redis, logger)

  const createPricingRule = new CreatePricingRule(ruleRepo, eventPublisher, logger)
  const computeDynamicRate = new ComputeDynamicRate(
    ruleRepo, rateRepo, cache, surgeController, eventPublisher, logger, config.MAX_SURGE_MULTIPLIER,
  )
  const getCurrentRate = new GetCurrentRate(rateRepo, cache)
  const applySurgePricing = new ApplySurgePricing(surgeController, ruleRepo, eventPublisher, logger, config.MAX_SURGE_MULTIPLIER)
  const listPricingRules = new ListPricingRules(ruleRepo)
  const syncOtaRates = new SyncOtaRates(rateRepo, eventPublisher, logger)

  const controller = new PricingController(
    createPricingRule, computeDynamicRate, getCurrentRate,
    applySurgePricing, listPricingRules, syncOtaRates,
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

  app.use(createHealthRouter(db, redis))
  app.use(createPricingApiRouter(controller))

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found', statusCode: 404 } })
  })
  app.use(createErrorHandler(logger))

  return app
}
