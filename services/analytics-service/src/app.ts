import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { getPrismaClient } from '@stayflexi/shared-database'
import { createRequestLogger } from '@stayflexi/shared-logger'
import type { Logger } from '@stayflexi/shared-logger'
import { MetricsRegistry, createHttpMetricsMiddleware, createMetricsHandler } from '@stayflexi/shared-observability'
import type Redis from 'ioredis'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'

import type { AnalyticsConfig } from './config/index'
import { correlationMiddleware } from './middleware/correlation'
import { authMiddleware } from './middleware/auth'
import { createErrorHandler } from './middleware/errorHandler'
import { createAnalyticsApiRouter } from './interfaces/http/routes'
import { AnalyticsController } from './interfaces/http/AnalyticsController'
import { schema } from './interfaces/graphql/schema'

// Infrastructure & Use Cases
import { PrismaRevenueMetricRepository } from './infrastructure/database/PrismaRevenueMetricRepository'
import { PrismaAnalyticsSnapshotRepository } from './infrastructure/database/PrismaAnalyticsSnapshotRepository'
import { PrismaAnalyticsReportRepository } from './infrastructure/database/PrismaAnalyticsReportRepository'
import { AnalyticsCache } from './infrastructure/cache/AnalyticsCache'
import { KpiCalculator } from './aggregators/KpiCalculator'
import { ReportAggregator } from './aggregators/ReportAggregator'
import { ExportGenerator } from './exports/ExportGenerator'

import { GetRevenueAnalytics } from './application/use-cases/GetRevenueAnalytics'
import { GetOccupancyAnalytics } from './application/use-cases/GetOccupancyAnalytics'
import { GetBookingAnalytics } from './application/use-cases/GetBookingAnalytics'
import { GetOperationsAnalytics } from './application/use-cases/GetOperationsAnalytics'
import { GetForecast } from './application/use-cases/GetForecast'
import { GetFinancialReport } from './application/use-cases/GetFinancialReport'
import { GetOccupancyReport } from './application/use-cases/GetOccupancyReport'
import { GetOtaReport } from './application/use-cases/GetOtaReport'
import { GetDashboard } from './application/use-cases/GetDashboard'
import { GenerateReport } from './application/use-cases/GenerateReport'
import { GetReport } from './application/use-cases/GetReport'

export function createApp(
  config: AnalyticsConfig,
  redis: Redis,
  logger: Logger
): express.Application {
  const db = getPrismaClient(config.DATABASE_URL)

  // Infrastructure Instantiations
  const revenueMetricRepo = new PrismaRevenueMetricRepository(db)
  const snapshotRepo = new PrismaAnalyticsSnapshotRepository(db)
  const reportRepo = new PrismaAnalyticsReportRepository(db)
  const cache = new AnalyticsCache(redis)
  
  const kpiCalculator = new KpiCalculator(db, logger)
  const reportAggregator = new ReportAggregator(db, revenueMetricRepo, snapshotRepo, kpiCalculator, logger)
  const exportGenerator = new ExportGenerator(reportAggregator, cache, logger)

  // Use Cases Instantiations
  const getRevenueAnalytics = new GetRevenueAnalytics(revenueMetricRepo, kpiCalculator, cache, logger)
  const getOccupancyAnalytics = new GetOccupancyAnalytics(kpiCalculator, cache, logger)
  const getBookingAnalytics = new GetBookingAnalytics(db, cache, logger)
  const getOperationsAnalytics = new GetOperationsAnalytics(db, logger)
  const getForecast = new GetForecast(db, cache, logger)
  const getFinancialReport = new GetFinancialReport(reportAggregator, cache, logger)
  const getOccupancyReport = new GetOccupancyReport(reportAggregator, logger)
  const getOtaReport = new GetOtaReport(reportAggregator, logger)
  const getDashboard = new GetDashboard(db, kpiCalculator, cache, logger)
  const generateReport = new GenerateReport(reportRepo, reportAggregator, exportGenerator, logger)
  const getReport = new GetReport(reportRepo, logger)

  // Controller Instantiation
  const controller = new AnalyticsController(
    getRevenueAnalytics,
    getOccupancyAnalytics,
    getBookingAnalytics,
    getOperationsAnalytics,
    getForecast,
    getFinancialReport,
    getOccupancyReport,
    getOtaReport,
    getDashboard,
    generateReport,
    getReport,
    exportGenerator
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
    res.json({ status: 'alive', service: 'analytics-service', uptime: Date.now() - startTime, timestamp: new Date().toISOString() })
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

  app.use(createAnalyticsApiRouter(controller))

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
            getRevenueAnalytics,
            getOccupancyAnalytics,
            getBookingAnalytics,
            getOperationsAnalytics,
            getForecast,
            getFinancialReport,
            getOccupancyReport,
            getOtaReport,
            getDashboard,
            generateReport,
            getReport,
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
