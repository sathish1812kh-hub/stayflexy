import './tracing'
import Redis from 'ioredis'
import { loadBookingConfig } from './config'
import { createApp } from './interfaces/app'
import { createLogger } from '@stayflexi/shared-logger'
import { createEventPublisher } from '@stayflexi/shared-events'
import { getPrismaClient } from '@stayflexi/shared-database'
import { InventoryEventConsumer } from './workers/InventoryEventConsumer'

async function main(): Promise<void> {
  const config = loadBookingConfig()
  const logger = createLogger({
    serviceName: 'booking-service',
    environment: config.NODE_ENV,
    level: config.LOG_LEVEL,
  })

  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Starting booking-service')

  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })
  await redis.connect()
  await redis.ping()
  logger.info('Redis connected')

  const eventPublisher = await createEventPublisher({
    brokers: config.KAFKA_BROKERS,
    clientId: config.KAFKA_CLIENT_ID ?? 'booking-service',
    enabled: config.KAFKA_ENABLED,
  })
  logger.info({ connected: eventPublisher.isConnected() }, 'Event publisher initialized')

  const app = createApp(config, redis, eventPublisher, logger)

  // Start Kafka consumer for inventory events (non-blocking)
  const consumer = new InventoryEventConsumer(config, logger)
  consumer.start().catch((err: unknown) => {
    logger.error({ err }, 'Inventory event consumer failed to start')
  })

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'booking-service listening')
  })

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
    setTimeout(() => { logger.error('Forced shutdown after timeout'); process.exit(1) }, 15000)
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT', () => { void shutdown('SIGINT') })
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
  console.error('[booking-service] Fatal startup error:', err)
  process.exit(1)
})
