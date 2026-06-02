import { createProxyMiddleware } from 'http-proxy-middleware'
import type { Application, Response as ExpressResponse } from 'express'
import type { loadGatewayConfig } from './config'

type ServiceConfig = ReturnType<typeof loadGatewayConfig>['services']

interface RouteDefinition {
  pathPrefix: string
  target: string
}

function getRoutes(services: ServiceConfig): RouteDefinition[] {
  return [
    { pathPrefix: '/api/v1/auth', target: services.auth },
    { pathPrefix: '/api/v1/organizations', target: services.organization },
    { pathPrefix: '/api/v1/roles', target: services.organization },
    { pathPrefix: '/api/v1/hotels', target: services.hotel },
    { pathPrefix: '/api/v1/rooms', target: services.hotel },
    { pathPrefix: '/api/v1/room-types', target: services.hotel },
    { pathPrefix: '/api/v1/inventory', target: services.inventory },
    { pathPrefix: '/api/v1/bookings', target: services.booking },
    { pathPrefix: '/api/v1/payments', target: services.payment },
    { pathPrefix: '/api/v1/invoices', target: services.payment },
    { pathPrefix: '/api/v1/billing', target: services.payment },
    { pathPrefix: '/api/v1/ota', target: services.ota },
    { pathPrefix: '/api/v1/analytics', target: services.analytics },
    { pathPrefix: '/api/v1/revenue', target: services.analytics },
    { pathPrefix: '/api/v1/notifications', target: services.notification },
    { pathPrefix: '/api/v1/automation', target: services.workflow },
    { pathPrefix: '/api/v1/intelligence', target: services.workflow },
    { pathPrefix: '/api/v1/ai', target: services.workflow },
    { pathPrefix: '/api/v1/security', target: services.auth },
    { pathPrefix: '/api/v1/compliance', target: services.organization },
    { pathPrefix: '/api/v1/disaster-recovery', target: services.workflow },
    { pathPrefix: '/api/v1/resilience', target: services.workflow },
  ]
}

export function registerRoutes(app: Application, services: ServiceConfig): void {
  for (const route of getRoutes(services)) {
    app.use(
      route.pathPrefix,
      createProxyMiddleware({
        target: route.target,
        changeOrigin: true,
        on: {
          error: (_err, _req, res) => {
            const expressRes = res as ExpressResponse
            expressRes.status(502).json({
              success: false,
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Service temporarily unavailable',
                statusCode: 502,
              },
            })
          },
        },
        logger: {
          info: () => undefined,
          warn: () => undefined,
          error: () => undefined,
        },
      })
    )
  }
}
