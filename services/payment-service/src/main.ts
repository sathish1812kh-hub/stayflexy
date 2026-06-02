import './tracing'
import { loadPaymentConfig } from './config'
import { createApp } from './interfaces/app'
import { createLogger } from '@stayflexi/shared-logger'
import { createEventPublisher } from '@stayflexi/shared-events'
import { getPrismaClient } from '@stayflexi/shared-database'
import Redis from 'ioredis'
import { BookingEventConsumer } from './consumers/BookingEventConsumer'
import { PrismaPaymentRepository } from './infrastructure/database/PrismaPaymentRepository'

async function main(): Promise<void> {
  const config = loadPaymentConfig()
  const logger = createLogger({
    serviceName: 'payment-service',
    environment: config.NODE_ENV,
    level: config.LOG_LEVEL,
  })

  logger.info('Starting payment-service...')

  const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false, enableReadyCheck: true })
  await redis.ping()
  logger.info('Redis connected')

  const eventPublisher = await createEventPublisher({
    brokers: config.KAFKA_BROKERS,
    clientId: config.KAFKA_CLIENT_ID ?? 'payment-service',
    enabled: config.KAFKA_ENABLED,
  })
  logger.info({ connected: eventPublisher.isConnected() }, 'Event publisher initialized')

  const { app, reconciliationWorker } = createApp(config, redis, eventPublisher, logger)

  // Start reconciliation background worker
  reconciliationWorker.start()

  // Start Kafka consumer for booking events (non-blocking — does not prevent server start)
  let bookingConsumer: BookingEventConsumer | null = null
  if (config.KAFKA_ENABLED) {
    const kafka = BookingEventConsumer.createKafka(config)
    const db = getPrismaClient(config.DATABASE_URL)
    const paymentRepo = new PrismaPaymentRepository(db)
    bookingConsumer = new BookingEventConsumer(logger, paymentRepo, kafka, config.KAFKA_GROUP_ID)
    bookingConsumer.start().catch((err: unknown) => {
      logger.error({ err }, 'Booking event consumer failed to start')
    })
  } else {
    logger.info('KAFKA_ENABLED=false — booking event consumer not started')
  }

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'payment-service listening')
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Graceful shutdown initiated')
    reconciliationWorker.stop()
    if (bookingConsumer) await bookingConsumer.stop().catch(() => undefined)
    server.close(async () => {
      try {
        await eventPublisher.disconnect()
        await getPrismaClient().$disconnect()
        redis.disconnect()
        logger.info('payment-service shut down gracefully')
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
  process.on('uncaughtException', (err) => { logger.error({ err }, 'Uncaught exception'); process.exit(1) })
  process.on('unhandledRejection', (reason) => { logger.error({ reason }, 'Unhandled promise rejection') })
}

main().catch((err) => {
  console.error('[payment-service] Fatal startup error:', err)
  process.exit(1)
})
