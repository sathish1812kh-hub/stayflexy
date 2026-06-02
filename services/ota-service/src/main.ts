import './tracing'
import { loadOtaConfig } from './config/index'
import { createLogger } from '@stayflexi/shared-logger'
import { createEventPublisher } from '@stayflexi/shared-events'
import { getPrismaClient } from '@stayflexi/shared-database'
import Redis from 'ioredis'
import { createApp } from './app'

// Infrastructure (for retry worker)
import { PrismaOtaProviderRepository } from './infrastructure/database/PrismaOtaProviderRepository'
import { PrismaOtaMappingRepository } from './infrastructure/database/PrismaOtaMappingRepository'
import { PrismaSyncJobRepository } from './infrastructure/database/PrismaSyncJobRepository'
import { OtaDistributedLock } from './infrastructure/locking/OtaDistributedLock'
import { OtaEventPublisher } from './infrastructure/events/OtaEventPublisher'

// Adapters
import { AdapterFactory } from './adapters/AdapterFactory'

// Processors and Workers
import { SyncProcessor } from './processors/SyncProcessor'
import { RetryWorker } from './workers/RetryWorker'

async function main(): Promise<void> {
  const config = loadOtaConfig()
  const logger = createLogger({
    serviceName: 'ota-service',
    environment: config.NODE_ENV,
    level: config.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' | undefined,
  })

  logger.info('Starting ota-service...')

  // Connect Redis
  const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false })
  await redis.ping()
  logger.info('Redis connected')

  // Connect Kafka (falls back to NoOp if unavailable)
  const eventPublisher = await createEventPublisher({
    brokers: config.KAFKA_BROKERS,
    clientId: 'ota-service',
    enabled: config.KAFKA_ENABLED,
  })
  logger.info({ kafkaEnabled: config.KAFKA_ENABLED }, 'Event publisher ready')

  // Build Express app with DI
  const app = createApp(config, redis, eventPublisher, logger)

  // ── Retry Worker ───────────────────────────────────────────────────────────
  const db = getPrismaClient(config.DATABASE_URL)
  const providerRepo = new PrismaOtaProviderRepository(db)
  const mappingRepo = new PrismaOtaMappingRepository(db)
  const syncJobRepo = new PrismaSyncJobRepository(db)
  const lock = new OtaDistributedLock(redis, logger)
  const otaEventPublisher = new OtaEventPublisher(eventPublisher, logger)
  const adapterFactory = new AdapterFactory(logger)

  const syncProcessor = new SyncProcessor(
    syncJobRepo,
    providerRepo,
    mappingRepo,
    lock,
    otaEventPublisher,
    adapterFactory,
    logger,
  )

  const retryWorker = new RetryWorker(syncProcessor, logger, config.OTA_SYNC_INTERVAL_MS)
  retryWorker.start()

  // ── HTTP Server ────────────────────────────────────────────────────────────
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'ota-service listening')
  })

  // ── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Graceful shutdown initiated')
    retryWorker.stop()

    server.close(async () => {
      try {
        await eventPublisher.disconnect()
        redis.disconnect()
        await db.$disconnect()
      } catch (err) {
        logger.error({ err }, 'Error during shutdown cleanup')
      }
      logger.info('ota-service shut down gracefully')
      process.exit(0)
    })

    setTimeout(() => {
      logger.error('Forced shutdown after timeout')
      process.exit(1)
    }, 15000)
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT', () => { void shutdown('SIGINT') })
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception')
    void shutdown('uncaughtException')
  })
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection')
    void shutdown('unhandledRejection')
  })
}

main().catch((err) => {
  console.error('[ota-service] Startup error:', err)
  process.exit(1)
})
