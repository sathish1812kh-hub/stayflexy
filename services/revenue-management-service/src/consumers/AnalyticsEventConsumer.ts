import type { Kafka } from 'kafkajs'
import type { Logger } from '@stayflexi/shared-logger'
import type { RevenueCache } from '../infrastructure/cache/RevenueCache'
import { SUBSCRIBED_EVENTS } from '../events/revenueEvents'

export class AnalyticsEventConsumer {
  private consumer: ReturnType<InstanceType<typeof import('kafkajs')['Kafka']>['consumer']> | null = null

  constructor(
    private readonly logger: Logger,
    private readonly kafka: Kafka,
    private readonly cache: RevenueCache,
    private readonly groupId: string,
  ) {}

  async start(): Promise<void> {
    this.consumer = this.kafka.consumer({ groupId: this.groupId })
    await this.consumer.connect()
    await this.consumer.subscribe({
      topics: ['analytics.events', 'booking.events'],
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
          this.logger.error({ err, eventType, topic }, 'Analytics event consumer error')
        }
      },
    })

    this.logger.info('Revenue analytics event consumer started')
  }

  private async handleEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const hotelId = payload['hotelId'] as string | undefined
    if (!hotelId) return

    switch (eventType) {
      case SUBSCRIBED_EVENTS.ANALYTICS_AGGREGATION_COMPLETED:
      case SUBSCRIBED_EVENTS.BOOKING_CREATED:
      case SUBSCRIBED_EVENTS.BOOKING_CANCELLED: {
        // Occupancy or actual revenue changed — invalidate cached recommendations
        await this.cache.invalidateHotelRecommendations(hotelId)
        this.logger.debug({ hotelId, eventType }, 'Hotel recommendations invalidated due to analytics update')
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
