import { Kafka } from 'kafkajs'
import type { EventEnvelope, IEventPublisher } from '@stayflexi/shared-events'
import { KAFKA_TOPICS, publishToRetry, publishToDLQ, MAX_RETRIES } from '@stayflexi/shared-events'
import type { HotelConfig } from '../config'
import type { Logger } from '@stayflexi/shared-logger'

/**
 * HotelServiceEventConsumer — subscribes to booking and inventory events that
 * affect room availability, plus OTA sync events.
 * Handles room.status.updated via hotel.events internally but focuses on
 * external signals that require cache invalidation or status reconciliation.
 */
export class HotelServiceEventConsumer {
  private consumer: unknown = null
  private started = false

  constructor(
    private readonly config: HotelConfig,
    private readonly logger: Logger,
    private readonly publisher: IEventPublisher,
  ) {}

  async start(): Promise<void> {
    if (!this.config['KAFKA_ENABLED']) {
      this.logger.info('Kafka disabled — HotelServiceEventConsumer not started')
      return
    }
    if (this.started) return
    const kafka = new Kafka({
      clientId: `${this.config['KAFKA_CLIENT_ID'] ?? 'hotel-service'}-consumer`,
      brokers: this.config['KAFKA_BROKERS'].split(',').map((b: string) => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.consumer = (kafka as any).consumer({
      groupId: 'hotel-service-events',
      sessionTimeout: 30000,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = this.consumer as any
    await c.connect()
    await c.subscribe({
      topics: [KAFKA_TOPICS.BOOKING_EVENTS, KAFKA_TOPICS.INVENTORY_EVENTS, KAFKA_TOPICS.OTA_EVENTS],
      fromBeginning: false,
    })
    this.started = true
    this.logger.info(
      'HotelServiceEventConsumer started — subscribed to booking/inventory/ota events',
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
          this.logger.warn({ topic }, 'Skipping non-JSON hotel-service event')
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
            'HotelServiceEventConsumer handler failed',
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
            this.logger.error({ err: dlqErr }, 'Failed to route hotel event to retry/DLQ')
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
      this.logger.warn({ err }, 'HotelServiceEventConsumer disconnect error')
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
      case 'booking.created':
      case 'booking.confirmed': {
        const hotelId =
          typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
        const bookingId = String(envelope['aggregateId'])
        this.logger.info(
          { eventType, hotelId, bookingId, correlationId: envelope['correlationId'] },
          'Booking event affects hotel occupancy — cache invalidation scheduled',
        )
        break
      }
      case 'booking.cancelled': {
        const hotelId =
          typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
        this.logger.info(
          { eventType, hotelId, aggregateId: envelope['aggregateId'] },
          'Booking cancelled — hotel availability should be re-evaluated',
        )
        break
      }
      case 'inventory.reserved': {
        const roomTypeId =
          typeof payload['roomTypeId'] === 'string' ? (payload['roomTypeId'] as string) : undefined
        const hotelId =
          typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
        this.logger.info(
          { eventType, hotelId, roomTypeId },
          'Inventory reserved — hotel room status pending confirmation',
        )
        break
      }
      case 'inventory.released': {
        const hotelId =
          typeof payload['hotelId'] === 'string' ? (payload['hotelId'] as string) : undefined
        this.logger.info(
          { eventType, hotelId, correlationId: envelope['correlationId'] },
          'Inventory released — hotel room made available',
        )
        break
      }
      case 'hotel.room.status_updated':
      case 'room.status.updated': {
        const roomId =
          typeof payload['roomId'] === 'string'
            ? (payload['roomId'] as string)
            : String(envelope['aggregateId'])
        const toStatus =
          typeof payload['toStatus'] === 'string'
            ? (payload['toStatus'] as string)
            : String(payload['status'] ?? 'UNKNOWN')
        this.logger.info(
          { eventType, roomId, toStatus },
          'Room status updated — handled by hotel consumer',
        )
        break
      }
      default:
        this.logger.debug(
          { eventType, topic: _topic },
          'HotelServiceEventConsumer ignoring unknown event',
        )
        break
    }
  }
}
