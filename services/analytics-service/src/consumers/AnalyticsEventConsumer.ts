import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs'
import type { PrismaClient } from '@prisma/client'
import type { Logger } from '@stayflexi/shared-logger'
import type { AnalyticsCache } from '../infrastructure/cache/AnalyticsCache'
import type { IRevenueMetricRepository } from '../domain/repositories/IRevenueMetricRepository'
import type { KpiCalculator } from '../aggregators/KpiCalculator'
import type { AnalyticsConfig } from '../config'
import { SUBSCRIBED_EVENTS } from '../events/analyticsEvents'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = PrismaClient & Record<string, any>

interface EventEnvelope {
  eventId: string
  eventType: string
  aggregateId: string
  aggregateType: string
  organizationId: string
  version: number
  timestamp: string
  correlationId?: string
  payload: Record<string, unknown>
}

const EVENT_TYPE_MAP: Record<string, string> = {
  'booking.created': 'BOOKING_CREATED',
  'booking.cancelled': 'BOOKING_CANCELLED',
  'booking.checked_in': 'BOOKING_CHECKED_IN',
  'booking.checked_out': 'BOOKING_CHECKED_OUT',
  'payment.completed': 'PAYMENT_COMPLETED',
  'payment.refunded': 'PAYMENT_REFUNDED',
  'inventory.reserved': 'INVENTORY_RESERVED',
  'inventory.released': 'INVENTORY_RELEASED',
  'ota.sync.completed': 'OTA_SYNC_COMPLETED',
}

export class AnalyticsEventConsumer {
  private readonly consumer: Consumer
  private started = false

  constructor(
    private readonly logger: Logger,
    private readonly db: PrismaClient,
    private readonly cache: AnalyticsCache,
    private readonly revenueMetricRepo: IRevenueMetricRepository,
    private readonly kpiCalculator: KpiCalculator,
    kafka: Kafka,
    groupId = 'analytics-service-consumer',
  ) {
    this.consumer = kafka.consumer({ groupId, sessionTimeout: 30000 })
  }

  static createKafka(config: AnalyticsConfig): Kafka {
    return new Kafka({
      clientId: 'analytics-service-consumer',
      brokers: config.KAFKA_BROKERS.split(',').map(b => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
      connectionTimeout: 5000,
    })
  }

  async start(): Promise<void> {
    if (this.started) return
    await this.consumer.connect()
    await this.consumer.subscribe({
      topics: ['booking.events', 'payment.events', 'inventory.events', 'ota.events'],
      fromBeginning: false,
    })
    this.started = true
    this.logger.info('AnalyticsEventConsumer started — subscribed to booking/payment/inventory/ota events')

    this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessage(payload)
      },
    }).catch(err => {
      this.logger.error({ err }, 'AnalyticsEventConsumer run-loop error')
    })
  }

  async stop(): Promise<void> {
    if (!this.started) return
    this.started = false
    try {
      await this.consumer.disconnect()
      this.logger.info('AnalyticsEventConsumer stopped')
    } catch (err) {
      this.logger.warn({ err }, 'AnalyticsEventConsumer disconnect error')
    }
  }

  private async processMessage({ topic, message }: EachMessagePayload): Promise<void> {
    const raw = message.value?.toString()
    if (!raw) return

    let envelope: EventEnvelope
    try {
      envelope = JSON.parse(raw) as EventEnvelope
    } catch {
      this.logger.warn({ topic }, 'Skipping non-JSON analytics event')
      return
    }

    try {
      await this.handleEvent(envelope)
    } catch (err) {
      this.logger.error(
        { err, eventType: envelope.eventType, aggregateId: envelope.aggregateId, topic },
        'Failed to process analytics event'
      )
    }
  }

  private async handleEvent(envelope: EventEnvelope): Promise<void> {
    const { eventId, eventType, organizationId, payload } = envelope

    // Deduplicate by externalEventId — skip if already processed
    const analyticsEventModel = (this.db as AnyClient)['analyticsEvent']
    if (analyticsEventModel) {
      const exists = await analyticsEventModel.findUnique({ where: { externalEventId: eventId } }).catch(() => null)
      if (exists) {
        this.logger.debug({ eventId, eventType }, 'Skipping duplicate analytics event')
        return
      }
    }

    // Extract hotelId from payload
    const hotelId = typeof payload['hotelId'] === 'string' ? payload['hotelId'] : undefined

    // Store event for audit trail and deduplication
    if (analyticsEventModel) {
      const analyticsType = EVENT_TYPE_MAP[eventType]
      if (analyticsType) {
        await analyticsEventModel.create({
          data: {
            organizationId,
            hotelId: hotelId ?? null,
            eventType: analyticsType,
            externalEventId: eventId,
            eventData: payload,
            processedAt: new Date(),
          },
        }).catch((err: unknown) => {
          // P2002 = unique constraint violation — duplicate, safe to ignore
          const code = (err as Record<string, unknown>)['code']
          if (code !== 'P2002') {
            this.logger.warn({ err, eventId }, 'Failed to store analytics event')
          }
        })
      }
    }

    // Invalidate hotel cache when relevant events occur
    if (hotelId) {
      await this.cache.invalidateHotel(hotelId).catch(() => undefined)
      this.logger.debug({ hotelId, eventType, eventId }, 'Analytics cache invalidated for hotel')
    }

    // Trigger KPI recalculation for booking/payment events
    if (hotelId && organizationId && this.shouldTriggerAggregation(eventType)) {
      setImmediate(() => {
        void this.triggerAggregation(hotelId, organizationId)
      })
    }
  }

  private shouldTriggerAggregation(eventType: string): boolean {
    return [
      SUBSCRIBED_EVENTS.BOOKING_CREATED,
      SUBSCRIBED_EVENTS.BOOKING_CANCELLED,
      SUBSCRIBED_EVENTS.BOOKING_CHECKED_OUT,
      SUBSCRIBED_EVENTS.PAYMENT_COMPLETED,
      SUBSCRIBED_EVENTS.PAYMENT_REFUNDED,
    ].includes(eventType as typeof SUBSCRIBED_EVENTS[keyof typeof SUBSCRIBED_EVENTS])
  }

  private async triggerAggregation(hotelId: string, organizationId: string): Promise<void> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const kpis = await this.kpiCalculator.calculateKpis(hotelId, organizationId, today, new Date())
      await this.revenueMetricRepo.upsert({
        organizationId,
        hotelId,
        metricDate: today,
        occupancyRate: kpis.occupancyRate,
        adr: kpis.adr,
        revpar: kpis.revpar,
        totalRevenue: kpis.totalRevenue,
        bookingCount: kpis.totalBookings,
        cancellationRate: kpis.cancellationRate,
      })
      await this.cache.invalidateKpis(hotelId)
      this.logger.debug({ hotelId, organizationId }, 'Event-triggered aggregation completed')
    } catch (err) {
      this.logger.warn({ err, hotelId }, 'Event-triggered aggregation failed')
    }
  }
}
