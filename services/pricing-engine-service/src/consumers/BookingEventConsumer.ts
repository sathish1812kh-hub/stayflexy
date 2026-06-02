import type { Kafka } from 'kafkajs'
import type { Logger } from '@stayflexi/shared-logger'
import type { PricingCache } from '../infrastructure/cache/PricingCache'
import { SUBSCRIBED_EVENTS } from '../events/pricingEvents'

export class BookingEventConsumer {
  private consumer: ReturnType<InstanceType<typeof import('kafkajs')['Kafka']>['consumer']> | null = null

  constructor(
    private readonly logger: Logger,
    private readonly kafka: Kafka,
    private readonly cache: PricingCache,
    private readonly groupId: string,
  ) {}

  async start(): Promise<void> {
    this.consumer = this.kafka.consumer({ groupId: this.groupId })
    await this.consumer.connect()
    await this.consumer.subscribe({
      topics: ['booking.events', 'inventory.events'],
      fromBeginning: false,
    })

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const raw = message.value?.toString()
        if (!raw) return

        let envelope: Record<string, unknown>
        try {
          envelope = JSON.parse(raw) as Record<string, unknown>
        } catch {
          return
        }

        const eventType = envelope['eventType'] as string
        const payload = envelope['payload'] as Record<string, unknown>

        try {
          await this.handleEvent(eventType, payload)
        } catch (err) {
          this.logger.error({ err, eventType, topic }, 'Pricing event consumer error')
        }
      },
    })

    this.logger.info('Pricing booking event consumer started')
  }

  private async handleEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const hotelId = payload['hotelId'] as string | undefined
    if (!hotelId) return

    switch (eventType) {
      case SUBSCRIBED_EVENTS.BOOKING_CREATED:
      case SUBSCRIBED_EVENTS.BOOKING_CANCELLED:
      case SUBSCRIBED_EVENTS.INVENTORY_RESERVED:
      case SUBSCRIBED_EVENTS.INVENTORY_RELEASED: {
        // Occupancy changed — mark hotel rates as dirty for recomputation
        await this.cache.invalidateHotelRates(hotelId)
        this.logger.debug({ hotelId, eventType }, 'Hotel rates marked dirty due to occupancy change')
        break
      }
      default:
        break
    }
  }

  async stop(): Promise<void> {
    await this.consumer?.disconnect().catch(() => {})
    this.consumer = null
  }
}
