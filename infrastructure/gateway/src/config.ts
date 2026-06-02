interface GatewayConfig {
  port: number
  environment: 'development' | 'staging' | 'production'
  jwtSecret: string
  serviceKey: string
  rateLimit: { windowMs: number; maxRequests: number }
  services: {
    auth: string
    organization: string
    hotel: string
    inventory: string
    booking: string
    payment: string
    ota: string
    analytics: string
    notification: string
    workflow: string
  }
  cors: { origins: string[] }
}

export function loadGatewayConfig(): GatewayConfig {
  const env = process.env

  function requireEnv(key: string): string {
    const val = env[key]
    if (!val) throw new Error(`Missing required environment variable: ${key}`)
    return val
  }

  const rawEnvironment = env['NODE_ENV'] ?? 'development'
  const validEnvironments = ['development', 'staging', 'production'] as const
  type Env = (typeof validEnvironments)[number]
  const environment: Env = validEnvironments.includes(rawEnvironment as Env)
    ? (rawEnvironment as Env)
    : 'development'

  return {
    port: parseInt(env['PORT'] ?? '8080', 10),
    environment,
    jwtSecret: requireEnv('JWT_SECRET'),
    serviceKey: requireEnv('SERVICE_KEY'),
    rateLimit: {
      windowMs: parseInt(env['RATE_LIMIT_WINDOW_MS'] ?? '60000', 10),
      maxRequests: parseInt(env['RATE_LIMIT_MAX'] ?? '100', 10),
    },
    services: {
      auth: env['SERVICE_AUTH_URL'] ?? 'http://auth-service:3001',
      organization: env['SERVICE_ORGANIZATION_URL'] ?? 'http://organization-service:3002',
      hotel: env['SERVICE_HOTEL_URL'] ?? 'http://hotel-service:3003',
      inventory: env['SERVICE_INVENTORY_URL'] ?? 'http://inventory-service:3004',
      booking: env['SERVICE_BOOKING_URL'] ?? 'http://booking-service:3005',
      payment: env['SERVICE_PAYMENT_URL'] ?? 'http://payment-service:3006',
      ota: env['SERVICE_OTA_URL'] ?? 'http://ota-service:3007',
      analytics: env['SERVICE_ANALYTICS_URL'] ?? 'http://analytics-service:3008',
      notification: env['SERVICE_NOTIFICATION_URL'] ?? 'http://notification-service:3009',
      workflow: env['SERVICE_WORKFLOW_URL'] ?? 'http://workflow-service:3010',
    },
    cors: {
      origins: (env['CORS_ORIGINS'] ?? '*').split(',').map((s) => s.trim()),
    },
  }
}
