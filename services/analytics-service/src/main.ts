import './tracing'
import { loadAnalyticsConfig } from './config/index'
import { createLogger } from '@stayflexi/shared-logger'
import { createEventPublisher } from '@stayflexi/shared-events'
import { getPrismaClient } from '@stayflexi/shared-database'
import Redis from 'ioredis'
import { createApp } from './app'
import { PrismaRevenueMetricRepository } from './infrastructure/database/PrismaRevenueMetricRepository'
import { AnalyticsCache } from './infrastructure/cache/AnalyticsCache'
import { KpiCalculator } from './aggregators/KpiCalculator'
import { AggregationWorker } from './workers/AggregationWorker'
import { AnalyticsScheduler } from './schedulers/AnalyticsScheduler'
import { AnalyticsEventConsumer } from './consumers/AnalyticsEventConsumer'

async function main(): Promise<void> {
  const config = loadAnalyticsConfig()
  const logger = createLogger({ serviceName: 'analytics-service', environment: config.NODE_ENV, level: config.LOG_LEVEL })
  logger.info('Starting analytics-service...')

  const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false })
  await redis.ping()
  logger.info('Redis connected')

  const eventPublisher = await createEventPublisher({
    brokers: config.KAFKA_BROKERS,
    clientId: 'analytics-service',
    enabled: config.KAFKA_ENABLED,
  })
  logger.info({ connected: eventPublisher.isConnected() }, 'Event publisher initialized')

  const app = createApp(config, redis, logger)

  const db = getPrismaClient(config.DATABASE_URL)
  const cache = new AnalyticsCache(redis)
  const revenueMetricRepo = new PrismaRevenueMetricRepository(db)
  const kpiCalculator = new KpiCalculator(db, logger)

  // Hourly aggregation worker (backward compat) - Deprecated in favor of event stream
  const aggregationWorker = new AggregationWorker(db, revenueMetricRepo, kpiCalculator, cache, logger, config.ANALYTICS_CACHE_TTL_SECONDS * 1000)
  // aggregationWorker.start()

  // Scheduled aggregation with job tracking - Deprecated in favor of event stream
  const scheduler = new AnalyticsScheduler(db, kpiCalculator, revenueMetricRepo, cache, logger)
  // scheduler.start()

  // Kafka consumer for real-time analytics updates
  let eventConsumer: AnalyticsEventConsumer | null = null
  if (config.KAFKA_ENABLED) {
    const kafka = AnalyticsEventConsumer.createKafka(config)
    eventConsumer = new AnalyticsEventConsumer(logger, db, cache, revenueMetricRepo, kpiCalculator, kafka)
    eventConsumer.start().catch((err: unknown) => {
      logger.error({ err }, 'Analytics event consumer failed to start')
    })
    logger.info('Analytics event consumer started')
  } else {
    logger.info('KAFKA_ENABLED=false — analytics event consumer not started')
  }

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'analytics-service listening')
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Graceful shutdown initiated')
    aggregationWorker.stop()
    scheduler.stop()
    if (eventConsumer) await eventConsumer.stop().catch(() => undefined)
    server.close(async () => {
      await eventPublisher.disconnect()
      redis.disconnect()
      await db.$disconnect()
      logger.info('analytics-service shut down gracefully')
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 15000)
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT', () => { void shutdown('SIGINT') })
  process.on('uncaughtException', (err) => { logger.error({ err }, 'Uncaught exception'); process.exit(1) })
  process.on('unhandledRejection', (reason) => { logger.error({ reason }, 'Unhandled rejection') })
}

main().catch(err => { console.error('[analytics-service] Startup error:', err); process.exit(1) })
