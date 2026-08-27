import { Kafka } from 'kafkajs'
import type { EventEnvelope, IEventPublisher } from '@stayflexi/shared-events'
import { KAFKA_TOPICS, publishToRetry, publishToDLQ, MAX_RETRIES } from '@stayflexi/shared-events'
import type { InventoryConfig } from '../config'
import type { Logger } from '@stayflexi/shared-logger'

/**
 * InventoryServiceEventConsumer — subscribes to booking events to drive
 * inventory reserve/release plus hotel events for block adjustments.
 * Complements the existing HotelEventConsumer.
 */
export class InventoryServiceEventConsumer {
  private consumer: unknown = null
  private started = false

  constructor(
    private readonly config: InventoryConfig,
    private readonly logger: Logger,
    private readonly publisher: IEventPublisher,
  ) {}

  async start(): Promise<void> {
    if (!this.config['KAFKA_ENABLED']) {
      this.logger.info('Kafka disabled — InventoryServiceEventConsumer not started')
      return
    }
    if (this.started) return
    const kafka = new Kafka({
      clientId: `${this.config['KAFKA_CLIENT_ID'] ?? 'inventory-service'}-booking-consumer`,
      brokers: this.config['KAFKA_BROKERS'].split(',').map((b: string) => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.consumer = (kafka as any).consumer({
      groupId: 'inventory-service-booking-events',
      sessionTimeout: 30000,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.consumer as any
    await c.connect()
    await c.subscribe({
      topics: [KAFKA_TOPICS.BOOKING_EVENTS, KAFKA_TOPICS.HOTEL_EVENTS, KAFKA_TOPICS.PAYMENT_EVENTS],
      fromBeginning: false,
    })
    this.started = true
    this.logger.info(
      'InventoryServiceEventConsumer started — subscribed to booking/hotel/payment events',
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
          this.logger.warn({ topic }, 'Skipping non-JSON inventory-service event')
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
            'InventoryServiceEventConsumer handler failed',
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
            this.logger.error({ err: dlqErr }, 'Failed to route inventory event to retry/DLQ')
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
      this.logger.warn({ err }, 'InventoryServiceEventConsumer disconnect error')
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
        const roomTypeId =
          typeof payload['roomTypeId'] === 'string' ? (payload['roomTypeId'] as string) : undefined
        this.logger.info(
          {
            eventType,
            hotelId,
            roomTypeId,
            bookingId: envelope['aggregateId'],
            correlationId: envelope['correlationId'],
          },
          'Booking created — inventory reservation requested',
        )
        break
      }
      case 'booking.cancelled': {
        const hotelId =
          typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
        this.logger.info(
          { eventType, hotelId, bookingId: envelope['aggregateId'] },
          'Booking cancelled — inventory release requested',
        )
        break
      }
      case 'booking.checked_out': {
        this.logger.info(
          { eventType, bookingId: envelope['aggregateId'] },
          'Booking checked out — inventory final release',
        )
        break
      }
      case 'hotel.room.status_updated':
      case 'hotel.updated': {
        const hotelId =
          typeof payload['hotelId'] === 'string'
            ? (payload['hotelId'] as string)
            : String(envelope['aggregateId'])
        this.logger.info({ eventType, hotelId }, 'Hotel event — inventory cache invalidation check')
        break
      }
      case 'payment.completed': {
        const bookingId =
          typeof payload['bookingId'] === 'string'
            ? (payload['bookingId'] as string)
            : String(envelope['aggregateId'])
        this.logger.info({ eventType, bookingId }, 'Payment completed — confirm inventory hold')
        break
      }
      case 'payment.failed': {
        const bookingId =
          typeof payload['bookingId'] === 'string' ? (payload['bookingId'] as string) : undefined
        this.logger.warn(
          { eventType, bookingId },
          'Payment failed — consider releasing held inventory',
        )
        break
      }
      default:
        this.logger.debug(
          { eventType, topic: _topic },
          'InventoryServiceEventConsumer ignoring unknown event',
        )
        break
    }
  }
}
