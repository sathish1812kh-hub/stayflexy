import { Kafka } from 'kafkajs'
import { HOTEL_EVENTS } from '@stayflexi/shared-events'
import type { EventEnvelope } from '@stayflexi/shared-events'
import type { IInventoryRepository } from '../domain/repositories/IInventoryRepository'
import type { InventoryConfig } from '../config'
import type { Logger } from '@stayflexi/shared-logger'

export class HotelEventConsumer {
  constructor(
    private readonly inventoryRepo: IInventoryRepository,
    private readonly config: InventoryConfig,
    private readonly logger: Logger
  ) {}

  async start(): Promise<void> {
    if (!this.config.KAFKA_ENABLED) {
      this.logger.info('Kafka disabled — hotel event consumer not started')
      return
    }

    const kafka = new Kafka({
      clientId: `${this.config.KAFKA_CLIENT_ID ?? 'inventory-service'}-consumer`,
      brokers: this.config.KAFKA_BROKERS.split(',').map((b) => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
    })

    const consumer = kafka.consumer({ groupId: 'inventory-service-hotel-events' })

    await consumer.connect()
    await consumer.subscribe({ topic: 'hotel.events', fromBeginning: false })

    this.logger.info('Hotel event consumer started, subscribed to hotel.events')

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return
        try {
          const envelope = JSON.parse(message.value.toString()) as EventEnvelope
          await this.handleEvent(envelope)
        } catch (err) {
          this.logger.error({ err }, 'Failed to process hotel event in inventory consumer')
        }
      },
    })
  }

  private async handleEvent(envelope: EventEnvelope): Promise<void> {
    switch (envelope.eventType) {
      case HOTEL_EVENTS.ROOM_STATUS_UPDATED: {
        const payload = envelope.payload as {
          hotelId?: string
          roomTypeId?: string
          toStatus?: string
        }
        this.logger.info(
          {
            eventType: envelope.eventType,
            hotelId: payload.hotelId,
            roomTypeId: payload.roomTypeId,
            toStatus: payload.toStatus,
            correlationId: envelope.correlationId,
          },
          'Room status updated — inventory administrator should review blocks if MAINTENANCE/OUT_OF_ORDER'
        )
        break
      }

      case HOTEL_EVENTS.HOTEL_UPDATED: {
        const payload = envelope.payload as { hotelId?: string }
        this.logger.info(
          { eventType: envelope.eventType, hotelId: payload.hotelId },
          'Hotel updated event received by inventory consumer'
        )
        break
      }

      default:
        // Silently ignore unknown hotel event types
        break
    }
  }
}
