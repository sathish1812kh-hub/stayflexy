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
import { extractAuthUser } from '@stayflexi/shared-types'
import type Redis from 'ioredis'

import { correlationMiddleware } from '../middleware/correlation'
import { createRateLimiter } from '../middleware/rateLimit'
import { errorHandler } from '../middleware/errorHandler'
import { createAuthRouter } from './http/routes'
import { createInternalRBACRouter, InternalRBACController } from './http/InternalRBACController'
import { createHealthRouter } from './http/HealthController'
import { AuthController } from './http/AuthController'

// Use cases
import { RegisterUser } from '../application/use-cases/RegisterUser'
import { LoginUser } from '../application/use-cases/LoginUser'
import { LogoutUser } from '../application/use-cases/LogoutUser'
import { RefreshTokens } from '../application/use-cases/RefreshTokens'
import { GetCurrentUser } from '../application/use-cases/GetCurrentUser'
import { ManageRoles } from '../application/use-cases/ManageRoles'
import { ManageInvitations } from '../application/use-cases/ManageInvitations'

// Application services
import { TokenService } from '../application/services/TokenService'
import { BruteForceProtector } from '../application/services/BruteForceProtector'
import { SessionCache } from '../application/services/SessionCache'

// Infrastructure
import { PrismaUserRepository } from '../infrastructure/database/PrismaUserRepository'
import { PrismaRefreshTokenRepository } from '../infrastructure/database/PrismaRefreshTokenRepository'
import { PrismaRBACRepository } from '../infrastructure/database/PrismaRBACRepository'
import { PrismaInvitationRepository } from '../infrastructure/database/PrismaInvitationRepository'

import type { AuthConfig } from '../config'

export function createApp(
  config: AuthConfig,
  redis: Redis,
  eventPublisher: IEventPublisher,
  logger: Logger,
): express.Application {
  const db = getPrismaClient(config.DATABASE_URL)

  // Infrastructure
  const userRepo = new PrismaUserRepository(db)
  const tokenRepo = new PrismaRefreshTokenRepository(db)
  const rbacRepo = new PrismaRBACRepository(db)
  const invitationRepo = new PrismaInvitationRepository(db)
  const sessionCache = new SessionCache(redis)
  const bruteForce = new BruteForceProtector(
    redis,
    config.BRUTE_FORCE_MAX_ATTEMPTS,
    config.BRUTE_FORCE_WINDOW_SECONDS,
  )

  // Application services
  const REFRESH_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
  const tokenService = new TokenService(
    tokenRepo,
    config.JWT_SECRET,
    config.JWT_REFRESH_SECRET,
    config.JWT_ACCESS_EXPIRES_IN,
    REFRESH_EXPIRES_IN_MS,
  )

  // Use cases
  const registerUser = new RegisterUser(
    userRepo,
    tokenService,
    eventPublisher,
    logger,
    config.BCRYPT_ROUNDS,
  )
  const loginUser = new LoginUser(userRepo, tokenService, bruteForce, eventPublisher, logger)
  const logoutUser = new LogoutUser(tokenRepo, sessionCache, logger)
  const refreshTokens = new RefreshTokens(tokenRepo, userRepo, tokenService, logger)
  const getCurrentUser = new GetCurrentUser(userRepo, sessionCache)
  const manageRoles = new ManageRoles(rbacRepo, userRepo, logger, redis)
  const manageInvitations = new ManageInvitations(
    invitationRepo,
    rbacRepo,
    userRepo,
    tokenService,
    db,
    eventPublisher,
    logger,
  )

  // Controller
  const controller = new AuthController(
    registerUser,
    loginUser,
    logoutUser,
    refreshTokens,
    getCurrentUser,
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
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Correlation-Id',
        'X-Service-Token',
        'X-Service-Key',
      ],
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  const registry = new MetricsRegistry()
  app.use(correlationMiddleware)
  app.use(createRequestLogger(logger))
  app.use(createHttpMetricsMiddleware(registry) as unknown as express.RequestHandler)
  app.get('/metrics', createMetricsHandler(registry) as unknown as express.RequestHandler)
  app.use(createRateLimiter(config.RATE_LIMIT_WINDOW_MS, config.RATE_LIMIT_MAX_REQUESTS))

  // Routes
  app.use(createHealthRouter(db, redis))
  app.use(createAuthRouter(controller))
  app.use(createInternalRBACRouter(new InternalRBACController(manageRoles, config.SERVICE_KEY)))

  // Mount Apollo Server Federated GraphQL Middleware
  const apolloServer = new ApolloServer({
    schema,
  })
  void apolloServer.start().then(() => {
    app.use(
      '/graphql',
      expressMiddleware(apolloServer, {
        context: async ({ req }) => {
          const authUser = extractAuthUser(
            req.headers as Record<string, string | string[] | undefined>,
            config.SERVICE_KEY,
          )

          const ipAddress =
            (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
          const userAgent = (req.headers['user-agent'] as string) || 'GraphQL-Client'
          const correlationId = (req.headers['x-correlation-id'] as string) || ''

          return {
            userId: authUser?.userId ?? null,
            organizationId: authUser?.organizationId ?? null,
            primaryRole: authUser?.primaryRole ?? null,
            isServiceCall: authUser?.isServiceCall ?? false,
            correlationId,
            ipAddress,
            userAgent,
            registerUser,
            loginUser,
            logoutUser,
            refreshTokens,
            getCurrentUser,
            manageRoles,
            manageInvitations,
          }
        },
      }),
    )
  })

  app.use(errorHandler)
  return app
}
