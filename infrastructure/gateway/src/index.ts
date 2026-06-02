import { createGatewayApp } from './app'
import { loadGatewayConfig } from './config'
import Redis from 'ioredis'

async function main(): Promise<void> {
  const config = loadGatewayConfig()

  const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  })

  await redis.ping()
  console.log('[api-gateway] Redis connection established')

  const app = createGatewayApp(config, redis)

  const server = app.listen(config.port, () => {
    console.log(
      `[api-gateway] Listening on port ${config.port} in ${config.environment} mode`
    )
  })

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[api-gateway] Received ${signal}, shutting down gracefully`)
    server.close(() => {
      redis.disconnect()
      process.exit(0)
    })
    // Force exit after 10s if graceful shutdown stalls
    setTimeout(() => {
      console.error('[api-gateway] Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
}

main().catch((error) => {
  console.error('[api-gateway] Startup failed:', error)
  process.exit(1)
})
