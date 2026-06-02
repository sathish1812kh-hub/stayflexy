import './tracing'
import { loadAuthConfig } from './config'
import { createApp } from './interfaces/app'
import { createLogger } from '@stayflexi/shared-logger'
import { createEventPublisher } from '@stayflexi/shared-events'
import Redis from 'ioredis'

async function main(): Promise<void> {
  const config = loadAuthConfig()
  const logger = createLogger({
    serviceName: 'auth-service',
    environment: config.NODE_ENV,
    level: config.LOG_LEVEL,
  })

  logger.info('Starting auth-service...')

  // Redis connection
  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    enableReadyCheck: true,
  })
  await redis.ping()
  logger.info('Redis connected')

  // Event publisher (Kafka with graceful fallback to NoOp)
  const eventPublisher = await createEventPublisher({
    brokers: config.KAFKA_BROKERS,
    clientId: config.KAFKA_CLIENT_ID ?? 'auth-service',
    enabled: config.KAFKA_ENABLED,
  })
  logger.info({ connected: eventPublisher.isConnected() }, 'Event publisher initialized')

  const app = createApp(config, redis, eventPublisher, logger)

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'auth-service listening')
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Graceful shutdown initiated')
    server.close(async () => {
      await eventPublisher.disconnect()
      redis.disconnect()
      logger.info('auth-service shut down')
      process.exit(0)
    })
    // Force shutdown after 15 seconds
    setTimeout(() => {
      logger.error('Forced shutdown — timeout exceeded')
      process.exit(1)
    }, 15000)
  }

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception')
    void shutdown('uncaughtException')
  })
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection')
  })
}

main().catch((err) => {
  console.error('[auth-service] Fatal startup error:', err)
  process.exit(1)
})
