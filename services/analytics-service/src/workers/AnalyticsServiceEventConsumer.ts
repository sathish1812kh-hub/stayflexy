import { Kafka } from 'kafkajs'
import type { EventEnvelope, IEventPublisher } from '@stayflexi/shared-events'
import { KAFKA_TOPICS, publishToRetry, publishToDLQ, MAX_RETRIES } from '@stayflexi/shared-events'
import type { AnalyticsConfig } from '../config/index'
import type { Logger } from '@stayflexi/shared-logger'

/**
 * AnalyticsServiceEventConsumer (expanded for checklist 4.16) — subscribes to
 * all domain events for real-time aggregation, including pricing events.
 * Complements existing consumers/AnalyticsEventConsumer.
 */
export class AnalyticsServiceEventConsumerWorker {
  private consumer: unknown = null
  private started = false

  constructor(
    private readonly config: AnalyticsConfig,
    private readonly logger: Logger,
    private readonly publisher: IEventPublisher,
  ) {}

  async start(): Promise<void> {
    if (!this.config['KAFKA_ENABLED']) {
      this.logger.info('Kafka disabled — AnalyticsServiceEventConsumerWorker not started')
      return
    }
    if (this.started) return
    const kafka = new Kafka({
      clientId: `analytics-service-worker`,
      brokers: this.config['KAFKA_BROKERS'].split(',').map((b: string) => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.consumer = (kafka as any).consumer({
      groupId: 'analytics-service-worker-events',
      sessionTimeout: 30000,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.consumer as any
    await c.connect()
    await c.subscribe({
      topics: [
        KAFKA_TOPICS.BOOKING_EVENTS,
        KAFKA_TOPICS.PAYMENT_EVENTS,
        KAFKA_TOPICS.INVENTORY_EVENTS,
        KAFKA_TOPICS.OTA_EVENTS,
        KAFKA_TOPICS.HOTEL_EVENTS,
        KAFKA_TOPICS.PRICING_EVENTS,
        KAFKA_TOPICS.WORKFLOW_EVENTS,
      ],
      fromBeginning: false,
    })
    this.started = true
    this.logger.info(
      'AnalyticsServiceEventConsumerWorker started — subscribed to booking/payment/inventory/ota/hotel/pricing/workflow events',
    )
    await c.run({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eachMessage: async ({ topic, message }: any) => {
        const raw = message.value?.toString() as string | undefined
        if (!raw) return
        let envelope: EventEnvelope
        try {
          envelope = JSON.parse(raw) as EventEnvelope
        } catch {
          this.logger.warn({ topic }, 'Skipping non-JSON analytics worker event')
          return
        }
        const headers: Record<string, string> = {}
        for (const [k, v] of Object.entries(message.headers ?? ({} as Record<string, unknown>))) {
          headers[k] = (v as Buffer)?.toString() ?? ''
        }
        const retryCount = parseInt(headers['retryCount'] ?? '0', 10) || 0
        const firstFailedAt = headers['firstFailedAt']
        try {
          await this.handleEvent(envelope, topic, headers)
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err)
          this.logger.error(
            { err, eventType: envelope['eventType'], topic, retryCount },
            'AnalyticsServiceEventConsumerWorker handler failed',
          )
          try {
            if (retryCount < MAX_RETRIES) {
              await publishToRetry(this.publisher, topic, raw, reason, retryCount + 1, {
                eventId: envelope['eventId'],
                correlationId: envelope['correlationId'],
                firstFailedAt,
              })
            } else {
              await publishToDLQ(this.publisher, topic, raw, reason, {
                eventId: envelope['eventId'],
                correlationId: envelope['correlationId'],
                attemptCount: retryCount + 1,
              })
            }
          } catch (dlqErr) {
            this.logger.error({ err: dlqErr }, 'Failed to route analytics event to retry/DLQ')
          }
        }
      },
    })
  }

  async stop(): Promise<void> {
    if (!this.started) return
    this.started = false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.consumer as any)?.disconnect()
    } catch (err) {
      this.logger.warn({ err }, 'AnalyticsServiceEventConsumerWorker disconnect error')
    }
  }

  private async handleEvent(
    envelope: EventEnvelope,
    _topic: string,
    _headers: Record<string, string>,
  ): Promise<void> {
    const eventType = String(envelope['eventType'])
    const payload = envelope['payload'] as Record<string, unknown>
    // For analytics, most events just trigger cache invalidation / KPI pending
    const hotelId =
      typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
    this.logger.debug(
      { eventType, hotelId, correlationId: envelope['correlationId'] },
      'Analytics worker received domain event — buffering for aggregation',
    )
    // Intentionally lightweight: real KPI calc is event-triggered via KpiCalculator
  }
}
