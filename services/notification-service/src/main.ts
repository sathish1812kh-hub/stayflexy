import './tracing'
import { loadNotificationConfig } from './config/index'
import { createLogger } from '@stayflexi/shared-logger'
import { createEventPublisher } from '@stayflexi/shared-events'
import { getPrismaClient } from '@stayflexi/shared-database'
import Redis from 'ioredis'
import { createApp } from './app'
import { PrismaNotificationRepository } from './infrastructure/database/PrismaNotificationRepository'
import { ProviderFactory } from './providers/ProviderFactory'
import { NotificationRetryWorker } from './workers/NotificationRetryWorker'
import { BookingEventConsumer } from './consumers/BookingEventConsumer'

async function main(): Promise<void> {
  const config = loadNotificationConfig()
  const logger = createLogger({
    serviceName: 'notification-service',
    environment: config.NODE_ENV,
    level: config.LOG_LEVEL,
  })
  logger.info('Starting notification-service...')

  const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false })
  await redis.ping()
  logger.info('Redis connected')

  const eventPublisher = await createEventPublisher({
    brokers: config.KAFKA_BROKERS,
    clientId: 'notification-service',
    enabled: config.KAFKA_ENABLED,
  })

  const app = createApp(config, redis, eventPublisher, logger)

  // Initialise retry worker with its own repo/factory instances
  const db = getPrismaClient(config.DATABASE_URL)
  const notificationRepo = new PrismaNotificationRepository(db)
  const providerFactory = new ProviderFactory(logger)
  const retryWorker = new NotificationRetryWorker(notificationRepo, providerFactory, logger)
  retryWorker.start()

  let bookingEventConsumer: BookingEventConsumer | null = null
  if (config.KAFKA_ENABLED) {
    const { Kafka } = await import('kafkajs')
    const kafka = new Kafka({
      clientId: 'notification-service-consumer',
      brokers: config.KAFKA_BROKERS.split(',').map(b => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })
    const { PrismaTemplateRepository } = await import('./infrastructure/database/PrismaTemplateRepository')
    const { NotificationCache } = await import('./infrastructure/cache/NotificationCache')
    const { TemplateRenderer } = await import('./templates/TemplateRenderer')
    const templateRepo = new PrismaTemplateRepository(db)
    const notificationCache = new NotificationCache(redis)
    const templateRenderer = new TemplateRenderer()
    bookingEventConsumer = new BookingEventConsumer(
      logger, kafka, notificationRepo, templateRepo, providerFactory, templateRenderer, notificationCache, eventPublisher,
    )
    await bookingEventConsumer.start()
    logger.info('Booking event consumer started')
  }

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'notification-service listening')
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Graceful shutdown initiated')
    retryWorker.stop()
    if (bookingEventConsumer) await bookingEventConsumer.stop().catch(() => undefined)
    server.close(async () => {
      try {
        await eventPublisher.disconnect()
      } catch {
        // best-effort
      }
      redis.disconnect()
      await db.$disconnect()
      logger.info('notification-service shut down gracefully')
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 15_000)
  }

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
}

main().catch((err) => {
  console.error('[notification-service] Startup error:', err)
  process.exit(1)
})
