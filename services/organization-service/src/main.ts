import './tracing'
import Redis from 'ioredis'
import { loadOrgConfig } from './config'
import { createLogger } from '@stayflexi/shared-logger'
import { createEventPublisher } from '@stayflexi/shared-events'
import { createApp } from './interfaces/app'
import { getPrismaClient } from '@stayflexi/shared-database'

async function main(): Promise<void> {
  // 1. Load and validate configuration
  const config = loadOrgConfig()

  // 2. Bootstrap logger
  const logger = createLogger({
    serviceName: 'organization-service',
    environment: config.NODE_ENV,
    level: config.LOG_LEVEL,
  })

  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Starting organization-service')

  // 3. Connect Redis
  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  await redis.connect()
  await redis.ping()
  logger.info('Redis connected')

  // 4. Create event publisher (Kafka with graceful NoOp fallback)
  const eventPublisher = await createEventPublisher({
    brokers: config.KAFKA_BROKERS,
    clientId: config.KAFKA_CLIENT_ID ?? 'organization-service',
    enabled: config.KAFKA_ENABLED,
  })
  logger.info(
    { connected: eventPublisher.isConnected() },
    'Event publisher initialised'
  )

  // 5. Wire up app
  const app = createApp(config, redis, eventPublisher, logger)

  // 6. Start HTTP server
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'organization-service listening')
  })

  // 7. Graceful shutdown
  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Shutdown signal received')
    server.close(async () => {
      try {
        await eventPublisher.disconnect()
        await getPrismaClient().$disconnect()
        await redis.quit()
        logger.info('Graceful shutdown complete')
        process.exit(0)
      } catch (err) {
        logger.error({ err }, 'Error during shutdown')
        process.exit(1)
      }
    })
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT', () => { void shutdown('SIGINT') })

  // 8. Unhandled exception safety net
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception — process will exit')
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection — process will exit')
    process.exit(1)
  })
}

main().catch((err) => {
  console.error('[organization-service] Fatal startup error:', err)
  process.exit(1)
})
