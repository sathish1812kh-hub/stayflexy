import { Kafka } from 'kafkajs'
import type { EventEnvelope, IEventPublisher } from '@stayflexi/shared-events'
import { KAFKA_TOPICS, publishToRetry, publishToDLQ, MAX_RETRIES } from '@stayflexi/shared-events'
import type { PaymentConfig } from '../config'
import type { Logger } from '@stayflexi/shared-logger'

/**
 * PaymentServiceEventConsumer (expanded) — subscribes to booking, inventory and ota events.
 * Complements existing consumers/BookingEventConsumer which handles booking.cancelled audit.
 */
export class PaymentServiceEventConsumer {
  private consumer: unknown = null
  private started = false

  constructor(
    private readonly config: PaymentConfig,
    private readonly logger: Logger,
    private readonly publisher: IEventPublisher,
  ) {}

  async start(): Promise<void> {
    if (!this.config['KAFKA_ENABLED']) {
      this.logger.info('Kafka disabled — PaymentServiceEventConsumer not started')
      return
    }
    if (this.started) return
    const kafka = new Kafka({
      clientId: `${this.config['KAFKA_CLIENT_ID'] ?? 'payment-service'}-expanded-consumer`,
      brokers: this.config['KAFKA_BROKERS'].split(',').map((b: string) => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.consumer = (kafka as any).consumer({
      groupId: `${this.config['KAFKA_GROUP_ID']}-inventory-ota`,
      sessionTimeout: 30000,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.consumer as any
    await c.connect()
    await c.subscribe({
      topics: [KAFKA_TOPICS.INVENTORY_EVENTS, KAFKA_TOPICS.OTA_EVENTS, KAFKA_TOPICS.BOOKING_EVENTS],
      fromBeginning: false,
    })
    this.started = true
    this.logger.info(
      'PaymentServiceEventConsumer started — subscribed to inventory/ota/booking events',
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
          this.logger.warn({ topic }, 'Skipping non-JSON payment-service event')
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
            'PaymentServiceEventConsumer handler failed',
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
            this.logger.error({ err: dlqErr }, 'Failed to route payment event to retry/DLQ')
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
      this.logger.warn({ err }, 'PaymentServiceEventConsumer disconnect error')
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
      case 'inventory.reserved': {
        const bookingRef =
          typeof payload['bookingRef'] === 'string'
            ? (payload['bookingRef'] as string)
            : String(envelope['aggregateId'])
        this.logger.info(
          { eventType, bookingRef, correlationId: envelope['correlationId'] },
          'Inventory reserved — payment hold can proceed',
        )
        break
      }
      case 'inventory.released': {
        const bookingRef =
          typeof payload['bookingRef'] === 'string'
            ? (payload['bookingRef'] as string)
            : String(envelope['aggregateId'])
        this.logger.info(
          { eventType, bookingRef },
          'Inventory released — check if payment refund needed',
        )
        break
      }
      case 'booking.created': {
        this.logger.debug(
          { eventType, bookingId: envelope['aggregateId'] },
          'Booking created — payment context noted (expanded consumer)',
        )
        break
      }
      case 'booking.cancelled': {
        this.logger.info(
          { eventType, bookingId: envelope['aggregateId'] },
          'Booking cancelled — payment refund eligibility check (expanded)',
        )
        break
      }
      case 'ota.sync.completed':
      case 'ota.reservation.synced': {
        const hotelId =
          typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
        this.logger.info(
          { eventType, hotelId, correlationId: envelope['correlationId'] },
          'OTA sync — payment reconciliation check',
        )
        break
      }
      default:
        this.logger.debug(
          { eventType, topic: _topic },
          'PaymentServiceEventConsumer ignoring event',
        )
        break
    }
  }
}
