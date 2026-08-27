import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { schema } from './graphql/schema'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import { createRequestLogger } from '@stayflexi/shared-logger'
import {
  MetricsRegistry,
  createHttpMetricsMiddleware,
  createMetricsHandler,
} from '@stayflexi/shared-observability'
import { getPrismaClient } from '@stayflexi/shared-database'
import type Redis from 'ioredis'

import { correlationMiddleware } from '../middleware/correlation'
import { authMiddleware } from '../middleware/auth'
import { createRateLimiter } from '../middleware/rateLimit'
import { errorHandler } from '../middleware/errorHandler'
import { createOrganizationRouter } from './http/routes'
import { createGuestRouter } from './http/guest.routes'
import { createHealthRouter } from './http/HealthController'
import { OrganizationController } from './http/OrganizationController'
import { GuestController } from './http/GuestController'

// Use cases
import { CreateOrganization } from '../application/use-cases/CreateOrganization'
import { GetOrganization } from '../application/use-cases/GetOrganization'
import { UpdateOrganization } from '../application/use-cases/UpdateOrganization'
import { AddMember } from '../application/use-cases/AddMember'
import { RemoveMember } from '../application/use-cases/RemoveMember'
import { TransferOwnership } from '../application/use-cases/TransferOwnership'
import { ListOrganizations } from '../application/use-cases/ListOrganizations'
import { CreateGuest } from '../application/use-cases/CreateGuest'
import { GetGuest } from '../application/use-cases/GetGuest'
import { UpdateGuest } from '../application/use-cases/UpdateGuest'
import { DeleteGuest } from '../application/use-cases/DeleteGuest'
import { ListGuests } from '../application/use-cases/ListGuests'
import { FindOrCreateGuestByEmail } from '../application/use-cases/FindOrCreateGuestByEmail'

// Application services
import { OrganizationCache } from '../application/services/OrganizationCache'

// Infrastructure
import { PrismaOrganizationRepository } from '../infrastructure/database/PrismaOrganizationRepository'
import { PrismaMemberRepository } from '../infrastructure/database/PrismaMemberRepository'
import { PrismaGuestRepository } from '../infrastructure/database/PrismaGuestRepository'

import type { OrgConfig } from '../config'

export function createApp(
  config: OrgConfig,
  redis: Redis,
  eventPublisher: IEventPublisher,
  logger: Logger,
): express.Application {
  const db = getPrismaClient(config.DATABASE_URL)

  // Infrastructure
  const orgRepo = new PrismaOrganizationRepository(db)
  const memberRepo = new PrismaMemberRepository(db)
  const guestRepo = new PrismaGuestRepository(db)
  const orgCache = new OrganizationCache(redis, config.ORGANIZATION_CACHE_TTL)

  // Use cases
  const createOrg = new CreateOrganization(orgRepo, memberRepo, eventPublisher, logger)
  const getOrg = new GetOrganization(orgRepo, orgCache)
  const updateOrg = new UpdateOrganization(orgRepo, orgCache, eventPublisher, logger)
  const addMember = new AddMember(
    orgRepo,
    memberRepo,
    eventPublisher,
    logger,
    config.MAX_MEMBERS_PER_ORG,
  )
  const removeMember = new RemoveMember(orgRepo, memberRepo, eventPublisher, logger)
  const transferOwnership = new TransferOwnership(orgRepo, memberRepo, logger)
  const listOrgs = new ListOrganizations(orgRepo)

  // Guest use cases
  const createGuest = new CreateGuest(guestRepo, logger)
  const getGuest = new GetGuest(guestRepo, logger)
  const updateGuest = new UpdateGuest(guestRepo, logger)
  const deleteGuest = new DeleteGuest(guestRepo, logger)
  const listGuests = new ListGuests(guestRepo, logger)
  const findOrCreateGuestByEmail = new FindOrCreateGuestByEmail(guestRepo, logger)

  // Controllers
  const orgController = new OrganizationController(
    createOrg,
    getOrg,
    updateOrg,
    addMember,
    removeMember,
    transferOwnership,
    listOrgs,
    memberRepo,
  )
  const guestController = new GuestController(
    createGuest,
    getGuest,
    updateGuest,
    deleteGuest,
    listGuests,
    findOrCreateGuestByEmail,
    config,
  )

  // Express app
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(
    helmet({
      hsts: { maxAge: 31536000, includeSubDomains: true },
    }),
  )
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
    }),
  )
  app.use(express.json({ limit: '5mb' }))
  const registry = new MetricsRegistry()
  app.use(correlationMiddleware)
  app.use(createRequestLogger(logger))
  app.use(createHttpMetricsMiddleware(registry) as unknown as express.RequestHandler)
  app.get('/metrics', createMetricsHandler(registry) as unknown as express.RequestHandler)
  app.use(createRateLimiter(15 * 60 * 1000, 200))

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/v1/')) return authMiddleware(req, res, next)
    return next()
  })

  // Routes
  app.use(createHealthRouter(db, redis))
  app.use(createOrganizationRouter(orgController))
  app.use(createGuestRouter(guestController))

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
            createOrganization: createOrg,
            getOrganization: getOrg,
            updateOrganization: updateOrg,
            listOrganizations: listOrgs,
          }
        },
      }),
    )
  })

  // 404 handler
  app.use((req, res, next) => {
    if (req.path === '/graphql') {
      return next()
    }
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
        statusCode: 404,
      },
    })
  })

  app.use(errorHandler)
  return app
}
