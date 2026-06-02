import express from 'express'
import Redis from 'ioredis'
import { createSecurityMiddleware } from './middleware/security'
import { createAuthMiddleware } from './middleware/auth'
import { tracingMiddleware } from './middleware/tracing'
import { createRateLimitMiddleware } from './middleware/rateLimit'
import { registerRoutes } from './router'
import { createHealthRouter } from './health'
import type { loadGatewayConfig } from './config'
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'

type GatewayConfig = ReturnType<typeof loadGatewayConfig>

export function createGatewayApp(config: GatewayConfig, redis: Redis): express.Application {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '10mb' }))
  app.use(tracingMiddleware)
  app.use(...(createSecurityMiddleware(config.cors.origins) as [express.RequestHandler, ...express.RequestHandler[]]))

  // Health checks before auth and rate limiting
  app.use('/health', createHealthRouter(redis, new Date()))

  // Rate limiting on all /api routes
  app.use('/api', createRateLimitMiddleware(redis, config.rateLimit.windowMs, config.rateLimit.maxRequests))

  // JWT authentication on all /api routes
  app.use('/api', createAuthMiddleware(config.jwtSecret, config.serviceKey))

  // Proxy routes to upstream services
  registerRoutes(app, config.services)

  // Initialize Apollo Federated Gateway
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'hotels', url: `${config.services.hotel}/graphql` },
        { name: 'auth', url: `${config.services.auth}/graphql` },
        { name: 'organizations', url: `${config.services.organization}/graphql` },
        { name: 'bookings', url: `${config.services.booking}/graphql` },
        { name: 'inventory', url: `${config.services.inventory}/graphql` },
        { name: 'payments', url: `${config.services.payment}/graphql` },
        { name: 'ota', url: `${config.services.ota}/graphql` },
        { name: 'workflows', url: `${config.services.workflow}/graphql` },
        { name: 'analytics', url: `${config.services.analytics}/graphql` },
      ],
    }),
    buildService({ url }) {
      return new RemoteGraphQLDataSource({
        url,
        willSendRequest({ request, context }) {
          const ctx = context as Record<string, string | undefined>
          if (request.http) {
            if (ctx['userId']) request.http.headers.set('x-user-id', ctx['userId'])
            if (ctx['organizationId']) request.http.headers.set('x-organization-id', ctx['organizationId'])
            if (ctx['role']) request.http.headers.set('x-user-role', ctx['role'])
            if (ctx['correlationId']) request.http.headers.set('x-correlation-id', ctx['correlationId'])
            request.http.headers.set('x-service-key', config.serviceKey)
          }
        },
      })
    },
  })

  const apolloServer = new ApolloServer({
    gateway,
  })

  void apolloServer.start().then(() => {
    app.use(
      '/graphql',
      createAuthMiddleware(config.jwtSecret, config.serviceKey),
      expressMiddleware(apolloServer, {
        context: async ({ req }: { req: express.Request }) => {
          const userId = req.headers['x-user-id'] as string | undefined
          const orgId = req.headers['x-organization-id'] as string | undefined
          const role = req.headers['x-user-role'] as string | undefined
          const correlationId = req.headers['x-correlation-id'] as string | undefined

          return {
            userId: userId ?? null,
            organizationId: orgId ?? null,
            role: role ?? 'FRONT_DESK',
            correlationId,
          }
        },
      })
    )
  })

  // 404 fallback
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found', statusCode: 404 },
    })
  })

  return app
}
