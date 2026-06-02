import { Kafka } from 'kafkajs'
import { INVENTORY_EVENTS } from '@stayflexi/shared-events'
import type { EventEnvelope } from '@stayflexi/shared-events'
import type { BookingConfig } from '../config'
import type { Logger } from '@stayflexi/shared-logger'

export class InventoryEventConsumer {
  constructor(
    private readonly config: BookingConfig,
    private readonly logger: Logger
  ) {}

  async start(): Promise<void> {
    if (!this.config.KAFKA_ENABLED) {
      this.logger.info('Kafka disabled — inventory event consumer not started')
      return
    }

    const kafka = new Kafka({
      clientId: `${this.config.KAFKA_CLIENT_ID ?? 'booking-service'}-consumer`,
      brokers: this.config.KAFKA_BROKERS.split(',').map((b) => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })

    const consumer = kafka.consumer({
      groupId: `${this.config.KAFKA_GROUP_ID}-inventory`,
    })

    await consumer.connect()
    await consumer.subscribe({ topic: 'inventory.events', fromBeginning: false })

    this.logger.info(
      'Inventory event consumer started, subscribed to inventory.events'
    )

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return
        try {
          const envelope = JSON.parse(message.value.toString()) as EventEnvelope
          await this.handleEvent(envelope)
        } catch (err) {
          this.logger.error({ err }, 'Failed to process inventory event in booking consumer')
        }
      },
    })
  }

  private async handleEvent(envelope: EventEnvelope): Promise<void> {
    switch (envelope.eventType) {
      case INVENTORY_EVENTS.INVENTORY_RESERVED: {
        const payload = envelope.payload as {
          bookingRef?: string
          hotelId?: string
          roomTypeId?: string
          nights?: number
        }
        this.logger.info(
          {
            eventType: envelope.eventType,
            bookingRef: payload.bookingRef,
            hotelId: payload.hotelId,
            correlationId: envelope.correlationId,
          },
          'Inventory reserved event received by booking consumer'
        )
        break
      }

      case INVENTORY_EVENTS.INVENTORY_RELEASED: {
        const payload = envelope.payload as {
          bookingRef?: string
          hotelId?: string
          releasedCount?: number
        }
        this.logger.info(
          {
            eventType: envelope.eventType,
            bookingRef: payload.bookingRef,
            releasedCount: payload.releasedCount,
            correlationId: envelope.correlationId,
          },
          'Inventory released event received by booking consumer'
        )
        break
      }

      default:
        // Silently ignore unknown inventory event types
        break
    }
  }
}
