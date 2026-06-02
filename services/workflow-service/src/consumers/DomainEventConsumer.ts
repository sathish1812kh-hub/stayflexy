import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs'
import type { WorkflowEngine } from '../engines/WorkflowEngine'
import type { Logger } from '@stayflexi/shared-logger'

// The Kafka event envelope shape published by @stayflexi/shared-events
interface EventEnvelope {
  eventId: string
  eventType: string
  aggregateId: string
  aggregateType: string
  organizationId: string
  version: number
  timestamp: string
  correlationId?: string
  payload: Record<string, unknown>
}

export class DomainEventConsumer {
  private readonly consumer: Consumer
  private started = false

  constructor(
    private readonly engine: WorkflowEngine,
    private readonly logger: Logger,
    kafka: Kafka,
    groupId = 'workflow-service-consumer',
  ) {
    this.consumer = kafka.consumer({ groupId, sessionTimeout: 30000 })
  }

  async start(): Promise<void> {
    if (this.started) return
    await this.consumer.connect()
    await this.consumer.subscribe({
      topics: ['booking.events', 'payment.events', 'inventory.events', 'notification.events'],
      fromBeginning: false,
    })
    this.started = true
    this.logger.info('DomainEventConsumer started, subscribed to domain event topics')

    // Run in background — does not resolve until consumer stops
    this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessage(payload)
      },
    }).catch(err => {
      this.logger.error({ err }, 'DomainEventConsumer run loop error')
    })
  }

  async stop(): Promise<void> {
    if (!this.started) return
    this.started = false
    try {
      await this.consumer.disconnect()
    } catch (err) {
      this.logger.warn({ err }, 'DomainEventConsumer disconnect error')
    }
  }

  private async processMessage({ topic, message }: EachMessagePayload): Promise<void> {
    const raw = message.value?.toString()
    if (!raw) return

    let envelope: EventEnvelope
    try {
      envelope = JSON.parse(raw) as EventEnvelope
    } catch {
      this.logger.warn({ topic }, 'Skipping non-JSON Kafka message')
      return
    }

    if (!envelope.eventType || !envelope.organizationId) {
      this.logger.warn({ topic, eventType: envelope.eventType }, 'Skipping invalid event envelope')
      return
    }

    try {
      await this.engine.triggerByEvent(
        envelope.eventType,
        envelope.organizationId,
        {
          ...envelope.payload,
          aggregateId: envelope.aggregateId,
          aggregateType: envelope.aggregateType,
          eventType: envelope.eventType,
          correlationId: envelope.correlationId,
        },
      )
    } catch (err) {
      this.logger.error(
        { err, topic, eventType: envelope.eventType, aggregateId: envelope.aggregateId },
        'Failed to trigger workflow for domain event',
      )
    }
  }
}
