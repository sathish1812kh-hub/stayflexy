import './tracing'
import { loadRevenueManagementConfig } from './config/index'
import { createLogger } from '@stayflexi/shared-logger'
import { createEventPublisher } from '@stayflexi/shared-events'
import { getPrismaClient } from '@stayflexi/shared-database'
import Redis from 'ioredis'
import { createApp } from './app'
import { RevenueCache } from './infrastructure/cache/RevenueCache'
import { RevenueScheduler } from './schedulers/RevenueScheduler'
import { AnalyticsEventConsumer } from './consumers/AnalyticsEventConsumer'

async function main(): Promise<void> {
  const config = loadRevenueManagementConfig()
  const logger = createLogger({
    serviceName: 'revenue-management-service',
    environment: config.NODE_ENV,
    level: config.LOG_LEVEL,
  })
  logger.info('Starting revenue-management-service...')

  const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false, enableReadyCheck: true })
  await redis.ping()
  logger.info('Redis connected')

  const eventPublisher = await createEventPublisher({
    brokers: config.KAFKA_BROKERS,
    clientId: config.KAFKA_CLIENT_ID,
    enabled: config.KAFKA_ENABLED,
  })
  logger.info({ connected: eventPublisher.isConnected() }, 'Event publisher initialized')

  const app = createApp(config, redis, eventPublisher, logger)

  const cache = new RevenueCache(redis)
  const scheduler = new RevenueScheduler(cache, logger, config.SCHEDULER_INTERVAL_MS)
  scheduler.start()

  let analyticsConsumer: AnalyticsEventConsumer | null = null
  if (config.KAFKA_ENABLED) {
    const { Kafka } = await import('kafkajs')
    const kafka = new Kafka({
      clientId: `${config.KAFKA_CLIENT_ID}-consumer`,
      brokers: config.KAFKA_BROKERS.split(',').map(b => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })
    analyticsConsumer = new AnalyticsEventConsumer(logger, kafka, cache, config.KAFKA_GROUP_ID)
    analyticsConsumer.start().catch((err: unknown) => {
      logger.error({ err }, 'Analytics event consumer failed to start')
    })
  }

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'revenue-management-service listening')
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Graceful shutdown initiated')
    scheduler.stop()
    if (analyticsConsumer) await analyticsConsumer.stop().catch(() => {})
    server.close(async () => {
      try {
        await eventPublisher.disconnect()
        await getPrismaClient().$disconnect()
        redis.disconnect()
        logger.info('revenue-management-service shut down gracefully')
        process.exit(0)
      } catch (err) {
        logger.error({ err }, 'Error during shutdown')
        process.exit(1)
      }
    })
    setTimeout(() => { logger.error('Forced shutdown after timeout'); process.exit(1) }, 15_000)
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT', () => { void shutdown('SIGINT') })
  process.on('uncaughtException', (err) => { logger.error({ err }, 'Uncaught exception'); process.exit(1) })
  process.on('unhandledRejection', (reason) => { logger.error({ reason }, 'Unhandled rejection') })
}

main().catch((err) => {
  console.error('[revenue-management-service] Fatal startup error:', err)
  process.exit(1)
})
