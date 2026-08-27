import { Kafka } from 'kafkajs'
import type { EventEnvelope, IEventPublisher } from '@stayflexi/shared-events'
import { KAFKA_TOPICS, publishToRetry, publishToDLQ, MAX_RETRIES } from '@stayflexi/shared-events'
import type { OtaConfig } from '../config/index'
import type { Logger } from '@stayflexi/shared-logger'

/**
 * OtaServiceEventConsumer — subscribes to booking, inventory, hotel and payment events.
 * Drives availability pushes and reservation imports.
 */
export class OtaServiceEventConsumer {
  private consumer: unknown = null
  private started = false

  constructor(
    private readonly config: OtaConfig,
    private readonly logger: Logger,
    private readonly publisher: IEventPublisher,
  ) {}

  async start(): Promise<void> {
    if (!this.config['KAFKA_ENABLED']) {
      this.logger.info('Kafka disabled — OtaServiceEventConsumer not started')
      return
    }
    if (this.started) return
    const kafka = new Kafka({
      clientId: `ota-service-consumer`,
      brokers: this.config['KAFKA_BROKERS'].split(',').map((b: string) => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.consumer = (kafka as any).consumer({
      groupId: 'ota-service-events',
      sessionTimeout: 30000,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.consumer as any
    await c.connect()
    await c.subscribe({
      topics: [
        KAFKA_TOPICS.BOOKING_EVENTS,
        KAFKA_TOPICS.INVENTORY_EVENTS,
        KAFKA_TOPICS.HOTEL_EVENTS,
        KAFKA_TOPICS.PAYMENT_EVENTS,
      ],
      fromBeginning: false,
    })
    this.started = true
    this.logger.info(
      'OtaServiceEventConsumer started — subscribed to booking/inventory/hotel/payment events',
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
          this.logger.warn({ topic }, 'Skipping non-JSON ota-service event')
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
            'OtaServiceEventConsumer handler failed',
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
            this.logger.error({ err: dlqErr }, 'Failed to route OTA event to retry/DLQ')
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
      this.logger.warn({ err }, 'OtaServiceEventConsumer disconnect error')
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
      case 'booking.created': {
        const hotelId =
          typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
        const bookingId = String(envelope['aggregateId'])
        this.logger.info(
          { eventType, hotelId, bookingId, correlationId: envelope['correlationId'] },
          'Booking created — OTA availability push trigger',
        )
        break
      }
      case 'booking.cancelled': {
        const hotelId =
          typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
        this.logger.info(
          { eventType, hotelId, bookingId: envelope['aggregateId'] },
          'Booking cancelled — OTA availability release',
        )
        break
      }
      case 'inventory.reserved':
      case 'inventory.released': {
        const hotelId =
          typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
        const roomTypeId =
          typeof payload['roomTypeId'] === 'string' ? (payload['roomTypeId'] as string) : undefined
        this.logger.info(
          { eventType, hotelId, roomTypeId },
          'Inventory change — OTA channel inventory push needed',
        )
        break
      }
      case 'hotel.created':
      case 'hotel.updated':
      case 'hotel.room.created':
      case 'hotel.room.updated':
      case 'hotel.room.status_updated': {
        const hotelId =
          typeof payload['hotelId'] === 'string'
            ? (payload['hotelId'] as string)
            : String(envelope['aggregateId'])
        this.logger.info({ eventType, hotelId }, 'Hotel event — OTA mapping sync check')
        break
      }
      case 'payment.completed': {
        const bookingId =
          typeof payload['bookingId'] === 'string'
            ? (payload['bookingId'] as string)
            : String(envelope['aggregateId'])
        this.logger.info(
          { eventType, bookingId },
          'Payment completed — OTA reservation confirmation push',
        )
        break
      }
      default:
        this.logger.debug({ eventType, topic: _topic }, 'OtaServiceEventConsumer ignoring event')
        break
    }
  }
}
