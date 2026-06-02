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

import type { WorkflowConfig } from './config/index'
import { correlationMiddleware } from './middleware/correlation'
import { authMiddleware } from './middleware/auth'
import { createErrorHandler } from './middleware/errorHandler'
import { createWorkflowApiRouter } from './interfaces/http/routes'
import { WorkflowController } from './interfaces/http/WorkflowController'
import { schema } from './interfaces/graphql/schema'

// Infrastructure & Engines & Use Cases
import { PrismaWorkflowExecutionRepository } from './infrastructure/database/PrismaWorkflowExecutionRepository'
import { PrismaAutomationRuleRepository } from './infrastructure/database/PrismaAutomationRuleRepository'
import { WorkflowCache } from './infrastructure/cache/WorkflowCache'
import { ConditionEvaluator } from './engines/ConditionEvaluator'
import { WorkflowStepExecutor } from './engines/WorkflowStepExecutor'
import { WorkflowEngine } from './engines/WorkflowEngine'

import { CreateWorkflow } from './application/use-cases/CreateWorkflow'
import { ExecuteWorkflow } from './application/use-cases/ExecuteWorkflow'
import { GetWorkflow } from './application/use-cases/GetWorkflow'
import { ListWorkflows } from './application/use-cases/ListWorkflows'
import { RetryWorkflow } from './application/use-cases/RetryWorkflow'

export function createApp(
  config: WorkflowConfig,
  redis: Redis,
  eventPublisher: IEventPublisher,
  logger: Logger
): express.Application {
  const db = getPrismaClient(config.DATABASE_URL)

  // Infrastructure Instantiations
  const executionRepo = new PrismaWorkflowExecutionRepository(db)
  const ruleRepo = new PrismaAutomationRuleRepository(db)
  const cache = new WorkflowCache(redis)
  
  const conditionEvaluator = new ConditionEvaluator()
  const stepExecutor = new WorkflowStepExecutor(logger)
  
  const engine = new WorkflowEngine(
    executionRepo,
    ruleRepo,
    cache,
    conditionEvaluator,
    stepExecutor,
    eventPublisher,
    logger
  )

  // Use Cases Instantiations
  const createWorkflow = new CreateWorkflow(engine, logger)
  const executeWorkflow = new ExecuteWorkflow(engine, logger)
  const getWorkflow = new GetWorkflow(executionRepo)
  const listWorkflows = new ListWorkflows(executionRepo)
  const retryWorkflow = new RetryWorkflow(executionRepo, engine, logger)

  // Controller Instantiation
  const controller = new WorkflowController(
    createWorkflow,
    executeWorkflow,
    retryWorkflow,
    getWorkflow,
    listWorkflows,
    ruleRepo
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
    res.json({ status: 'alive', service: 'workflow-service', uptime: Date.now() - startTime, timestamp: new Date().toISOString() })
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

  app.use(createWorkflowApiRouter(controller))

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
            createWorkflow,
            executeWorkflow,
            getWorkflow,
            listWorkflows,
            retryWorkflow,
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
