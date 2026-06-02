import './tracing'
import { loadWorkflowConfig } from './config/index'
import { createLogger } from '@stayflexi/shared-logger'
import { createEventPublisher } from '@stayflexi/shared-events'
import { getPrismaClient } from '@stayflexi/shared-database'
import Redis from 'ioredis'
import { Kafka } from 'kafkajs'
import { createApp } from './app'
import { PrismaWorkflowExecutionRepository } from './infrastructure/database/PrismaWorkflowExecutionRepository'
import { PrismaAutomationRuleRepository } from './infrastructure/database/PrismaAutomationRuleRepository'
import { WorkflowCache } from './infrastructure/cache/WorkflowCache'
import { ConditionEvaluator } from './engines/ConditionEvaluator'
import { WorkflowStepExecutor } from './engines/WorkflowStepExecutor'
import { WorkflowEngine } from './engines/WorkflowEngine'
import { WorkflowRetryWorker } from './workers/WorkflowRetryWorker'
import { WorkflowScheduler } from './schedulers/WorkflowScheduler'
import { DomainEventConsumer } from './consumers/DomainEventConsumer'

async function main(): Promise<void> {
  const config = loadWorkflowConfig()
  const logger = createLogger({
    serviceName: 'workflow-service',
    environment: config.NODE_ENV,
    level: config.LOG_LEVEL,
  })
  logger.info('Starting workflow-service...')

  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  })
  await redis.ping()
  logger.info('Redis connected')

  const eventPublisher = await createEventPublisher({
    brokers: config.KAFKA_BROKERS,
    clientId: 'workflow-service',
    enabled: config.KAFKA_ENABLED,
  })

  const app = createApp(config, redis, eventPublisher, logger)

  // Workers — instantiate separate clients to avoid sharing state with app layer
  const db = getPrismaClient(config.DATABASE_URL)
  const cache = new WorkflowCache(redis)
  const executionRepo = new PrismaWorkflowExecutionRepository(db)
  const ruleRepo = new PrismaAutomationRuleRepository(db)
  const conditionEvaluator = new ConditionEvaluator()
  const stepExecutor = new WorkflowStepExecutor(logger)
  const engine = new WorkflowEngine(
    executionRepo,
    ruleRepo,
    cache,
    conditionEvaluator,
    stepExecutor,
    eventPublisher,
    logger,
  )
  const retryWorker = new WorkflowRetryWorker(executionRepo, engine, logger)
  const scheduler = new WorkflowScheduler(ruleRepo, engine, logger)

  retryWorker.start()
  scheduler.start()

  // Only start consumer when Kafka is enabled
  let domainEventConsumer: DomainEventConsumer | null = null
  if (config.KAFKA_ENABLED) {
    const kafka = new Kafka({
      clientId: 'workflow-service-consumer',
      brokers: config.KAFKA_BROKERS.split(',').map(b => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })
    domainEventConsumer = new DomainEventConsumer(engine, logger, kafka)
    await domainEventConsumer.start()
    logger.info('Domain event consumer started')
  }

  const server = app.listen(config.PORT, () => {
    logger.info(
      { port: config.PORT, env: config.NODE_ENV },
      'workflow-service listening',
    )
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Graceful shutdown initiated')
    retryWorker.stop()
    scheduler.stop()
    if (domainEventConsumer) await domainEventConsumer.stop()
    server.close(async () => {
      await eventPublisher.disconnect()
      redis.disconnect()
      await db.$disconnect()
      logger.info('workflow-service shut down gracefully')
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 15000)
  }

  process.on('SIGTERM', () => { void shutdown('SIGTERM') })
  process.on('SIGINT', () => { void shutdown('SIGINT') })
}

main().catch(err => {
  console.error('[workflow-service] Startup error:', err)
  process.exit(1)
})
