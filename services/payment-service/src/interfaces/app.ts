import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createRequestLogger } from '@stayflexi/shared-logger'
import { MetricsRegistry, createHttpMetricsMiddleware, createMetricsHandler } from '@stayflexi/shared-observability'
import { getPrismaClient } from '@stayflexi/shared-database'
import type { Logger } from '@stayflexi/shared-logger'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type Redis from 'ioredis'
import type { PaymentConfig } from '../config'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { schema } from './graphql/schema'

import { correlationMiddleware } from '../middleware/correlation'
import { errorHandler } from '../middleware/errorHandler'
import { idempotencyMiddleware } from '../middleware/idempotency'
import { authMiddleware } from '../middleware/auth'
import { createHealthRouter } from './http/HealthController'
import { createPaymentRouter } from './http/routes'
import { PaymentController } from './http/PaymentController'
import { WebhookController } from './http/WebhookController'

// Use cases
import { InitiatePayment } from '../application/use-cases/InitiatePayment'
import { ConfirmPayment } from '../application/use-cases/ConfirmPayment'
import { ProcessRefund } from '../application/use-cases/ProcessRefund'
import { GenerateInvoice } from '../application/use-cases/GenerateInvoice'
import { CancelPayment } from '../application/use-cases/CancelPayment'

// Infrastructure
import { PrismaPaymentRepository } from '../infrastructure/database/PrismaPaymentRepository'
import { PrismaInvoiceRepository } from '../infrastructure/database/PrismaInvoiceRepository'
import { PrismaLedgerRepository } from '../infrastructure/database/PrismaLedgerRepository'
import { PaymentCache } from '../infrastructure/cache/PaymentCache'
import { PaymentIdempotencyStore } from '../infrastructure/idempotency/PaymentIdempotencyStore'
import { RedisDistributedLock } from '../infrastructure/locking/RedisDistributedLock'

// Domain services
import { LedgerService } from '../ledger/LedgerService'
import { ReconciliationService } from '../reconciliation/ReconciliationService'

// Worker
import { ReconciliationWorker } from '../workers/ReconciliationWorker'

export interface AppResult {
  app: express.Application
  reconciliationWorker: ReconciliationWorker
}

export function createApp(config: PaymentConfig, redis: Redis, eventPublisher: IEventPublisher, logger: Logger): AppResult {
  const db = getPrismaClient(config.DATABASE_URL)

  // Infrastructure
  const paymentRepo = new PrismaPaymentRepository(db)
  const invoiceRepo = new PrismaInvoiceRepository(db)
  const ledgerRepo = new PrismaLedgerRepository(db)
  const cache = new PaymentCache(redis, config.PAYMENT_CACHE_TTL_SECONDS, config.INVOICE_CACHE_TTL_SECONDS)
  const idempotencyStore = new PaymentIdempotencyStore(redis, config.IDEMPOTENCY_TTL_SECONDS)
  const lock = new RedisDistributedLock(redis, logger)
  const ledger = new LedgerService(db, logger, ledgerRepo)
  const reconciliation = new ReconciliationService(paymentRepo, db, logger)

  // Use cases — all receive distributed lock for concurrency safety
  const initiatePayment = new InitiatePayment(paymentRepo, eventPublisher, logger, lock)
  const confirmPayment = new ConfirmPayment(paymentRepo, cache, ledger, eventPublisher, logger, lock)
  const processRefund = new ProcessRefund(paymentRepo, cache, ledger, eventPublisher, logger, lock)
  const generateInvoice = new GenerateInvoice(invoiceRepo, eventPublisher, logger)
  const cancelPayment = new CancelPayment(paymentRepo, cache, eventPublisher, logger, lock)

  // Controllers
  const controller = new PaymentController(
    initiatePayment, confirmPayment, processRefund, generateInvoice,
    paymentRepo, invoiceRepo, reconciliation, cache, cancelPayment
  )
  const webhookController = new WebhookController(
    paymentRepo, idempotencyStore, cache, eventPublisher, logger, config.WEBHOOK_SECRET
  )

  // Background worker
  const reconciliationWorker = new ReconciliationWorker(reconciliation, redis, logger)

  // Auth middleware factory bound to this config's SERVICE_KEY
  const auth = authMiddleware(config.SERVICE_KEY)

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'X-Correlation-Id',
      'Idempotency-Key', 'X-Organization-Id', 'X-User-Id', 'X-User-Role', 'X-Service-Key',
    ],
  }))
  // JSON body parsing — webhook route uses express.raw (set per-route in router)
  app.use((req, res, next) => {
    if (req.path === '/api/v1/payments/webhooks') {
      next()
    } else {
      express.json({ limit: '1mb' })(req, res, next)
    }
  })
  const registry = new MetricsRegistry()
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

  // Health checks — no auth required
  app.use(createHealthRouter(db, redis))

  // Apply idempotency to mutation routes (before auth so key is checked early)
  app.post('/api/v1/payments/initiate', idempotencyMiddleware(idempotencyStore))
  app.post('/api/v1/payments/:id/refund', idempotencyMiddleware(idempotencyStore))

  // Auth middleware: protect all payment and invoice API routes except webhooks.
  // The webhook path authenticates via HMAC signature in the controller itself.
  app.use((req, res, next) => {
    const path = req.path
    const isProtected =
      (path.startsWith('/api/v1/payments') && path !== '/api/v1/payments/webhooks') ||
      path.startsWith('/api/v1/invoices') ||
      path.startsWith('/api/v1/reconciliation')
    if (isProtected) {
      return auth(req, res, next)
    }
    return next()
  })

  app.use(createPaymentRouter(controller, webhookController))

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
            initiatePayment,
            confirmPayment,
            processRefund,
            generateInvoice,
            paymentRepo,
            invoiceRepo,
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

  return { app, reconciliationWorker }
}
