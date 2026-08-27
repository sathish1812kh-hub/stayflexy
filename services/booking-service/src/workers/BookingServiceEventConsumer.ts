import { Kafka } from 'kafkajs'
import type { EventEnvelope, IEventPublisher } from '@stayflexi/shared-events'
import { KAFKA_TOPICS, publishToRetry, publishToDLQ, MAX_RETRIES } from '@stayflexi/shared-events'
import type { BookingConfig } from '../config'
import type { Logger } from '@stayflexi/shared-logger'

/**
 * BookingServiceEventConsumer — subscribes to payment, inventory and OTA topics.
 * Handles: payment.completed / payment.failed / payment.refunded,
 *          inventory.reserved / inventory.released,
 *          ota.sync.completed / ota.reservation.synced (via ota.events)
 */
export class BookingServiceEventConsumer {
  private kafka: Kafka | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private consumer: any = null
  private started = false

  constructor(
    private readonly config: BookingConfig,
    private readonly logger: Logger,
    private readonly publisher: IEventPublisher,
  ) {}

  async start(): Promise<void> {
    if (!this.config.KAFKA_ENABLED) {
      this.logger.info('Kafka disabled — BookingServiceEventConsumer not started')
      return
    }
    if (this.started) return
    this.kafka = new Kafka({
      clientId: `${this.config['KAFKA_CLIENT_ID'] ?? 'booking-service'}-booking-consumer`,
      brokers: this.config['KAFKA_BROKERS'].split(',').map((b) => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })
    this.consumer = this.kafka.consumer({
      groupId: `${this.config['KAFKA_GROUP_ID']}-payment-inventory-ota`,
      sessionTimeout: 30000,
    })
    await this.consumer.connect()
    await this.consumer.subscribe({
      topics: [KAFKA_TOPICS.PAYMENT_EVENTS, KAFKA_TOPICS.INVENTORY_EVENTS, KAFKA_TOPICS.OTA_EVENTS],
      fromBeginning: false,
    })
    this.started = true
    this.logger.info(
      'BookingServiceEventConsumer started — subscribed to payment/inventory/ota events',
    )

    await this.consumer.run({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eachMessage: async ({ topic, partition, message }: any) => {
        const raw = message.value?.toString() as string | undefined
        if (!raw) return
        let envelope: EventEnvelope
        try {
          envelope = JSON.parse(raw) as EventEnvelope
        } catch {
          this.logger.warn({ topic, partition }, 'Skipping non-JSON booking-service event')
          return
        }
        const headers: Record<string, string> = {}
        for (const [k, v] of Object.entries(message.headers ?? ({} as Record<string, unknown>))) {
          headers[k] = (v as Buffer)?.toString() ?? ''
        }
        const retryCount = parseInt(headers['retryCount'] ?? headers['retry-count'] ?? '0', 10) || 0
        const firstFailedAt = headers['firstFailedAt'] ?? headers['first-failed-at']
        try {
          await this.handleEvent(envelope, topic, headers)
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err)
          this.logger.error(
            { err, eventType: envelope['eventType'], topic, retryCount },
            'BookingServiceEventConsumer handler failed',
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
            this.logger.error({ err: dlqErr }, 'Failed to route to retry/DLQ')
          }
        }
      },
    })
  }

  async stop(): Promise<void> {
    if (!this.started) return
    this.started = false
    try {
      await this.consumer?.disconnect()
    } catch (err) {
      this.logger.warn({ err }, 'BookingServiceEventConsumer disconnect error')
    }
  }

  private async handleEvent(
    envelope: EventEnvelope,
    _topic: string,
    _headers: Record<string, string>,
  ): Promise<void> {
    const eventType = String(envelope['eventType'])
    const payload = envelope['payload'] as Record<string, unknown>
    switch (eventType) {
      case 'payment.completed':
      case 'payment.succeeded': {
        const paymentId =
          typeof payload['paymentId'] === 'string'
            ? (payload['paymentId'] as string)
            : String(envelope['aggregateId'])
        const bookingId =
          typeof payload['bookingId'] === 'string'
            ? (payload['bookingId'] as string)
            : String(envelope['aggregateId'])
        this.logger.info(
          { eventType, paymentId, bookingId, correlationId: envelope['correlationId'] },
          'Payment completed — booking can be confirmed',
        )
        break
      }
      case 'payment.failed': {
        const paymentId =
          typeof payload['paymentId'] === 'string'
            ? (payload['paymentId'] as string)
            : String(envelope['aggregateId'])
        this.logger.warn(
          { eventType, paymentId, correlationId: envelope['correlationId'] },
          'Payment failed — booking remains pending',
        )
        break
      }
      case 'payment.refunded': {
        const refundId =
          typeof payload['refundId'] === 'string'
            ? (payload['refundId'] as string)
            : String(envelope['aggregateId'])
        this.logger.info(
          { eventType, refundId, correlationId: envelope['correlationId'] },
          'Payment refunded — booking refund noted',
        )
        break
      }
      case 'inventory.reserved': {
        const bookingRef =
          typeof payload['bookingRef'] === 'string'
            ? (payload['bookingRef'] as string)
            : String(envelope['aggregateId'])
        const hotelId =
          typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
        this.logger.info(
          { eventType, bookingRef, hotelId, correlationId: envelope['correlationId'] },
          'Inventory reserved — booking inventory secured',
        )
        break
      }
      case 'inventory.released': {
        const bookingRef =
          typeof payload['bookingRef'] === 'string'
            ? (payload['bookingRef'] as string)
            : String(envelope['aggregateId'])
        this.logger.info(
          { eventType, bookingRef, correlationId: envelope['correlationId'] },
          'Inventory released — booking cancellation processed',
        )
        break
      }
      case 'inventory.blocked':
      case 'inventory.unblocked': {
        this.logger.info(
          { eventType, correlationId: envelope['correlationId'] },
          'Inventory block state changed',
        )
        break
      }
      case 'ota.reservation.synced':
      case 'ota.sync.completed':
      case 'ota.reservation.imported': {
        const syncJobId =
          typeof payload['syncJobId'] === 'string'
            ? (payload['syncJobId'] as string)
            : String(envelope['aggregateId'])
        const hotelId =
          typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
        this.logger.info(
          { eventType, syncJobId, hotelId, correlationId: envelope['correlationId'] },
          'OTA sync completed — booking availability reconciled',
        )
        break
      }
      default:
        this.logger.debug(
          { eventType, topic: _topic },
          'BookingServiceEventConsumer ignoring unknown event',
        )
        break
    }
  }
}
