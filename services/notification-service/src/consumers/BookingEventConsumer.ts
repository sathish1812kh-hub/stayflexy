import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs'
import type { INotificationRepository } from '../domain/repositories/INotificationRepository'
import type { ITemplateRepository } from '../domain/repositories/ITemplateRepository'
import type { ProviderFactory } from '../providers/ProviderFactory'
import type { TemplateRenderer } from '../templates/TemplateRenderer'
import type { NotificationCache } from '../infrastructure/cache/NotificationCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import { SendNotification } from '../application/use-cases/SendNotification'
import type { Logger } from '@stayflexi/shared-logger'

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

export class BookingEventConsumer {
  private readonly consumer: Consumer
  private readonly sendNotification: SendNotification
  private started = false

  constructor(
    private readonly logger: Logger,
    kafka: Kafka,
    notificationRepo: INotificationRepository,
    templateRepo: ITemplateRepository,
    providerFactory: ProviderFactory,
    templateRenderer: TemplateRenderer,
    cache: NotificationCache,
    eventPublisher: IEventPublisher,
    groupId = 'notification-service-booking-consumer',
  ) {
    this.consumer = kafka.consumer({ groupId, sessionTimeout: 30000 })
    this.sendNotification = new SendNotification(
      notificationRepo,
      templateRepo,
      providerFactory,
      templateRenderer,
      cache,
      eventPublisher,
      logger,
    )
  }

  async start(): Promise<void> {
    if (this.started) return
    await this.consumer.connect()
    await this.consumer.subscribe({
      topics: ['booking.events', 'payment.events'],
      fromBeginning: false,
    })
    this.started = true
    this.logger.info('BookingEventConsumer started, subscribed to booking and payment event topics')

    this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessage(payload)
      },
    }).catch(err => {
      this.logger.error({ err }, 'BookingEventConsumer run loop error')
    })
  }

  async stop(): Promise<void> {
    if (!this.started) return
    this.started = false
    try {
      await this.consumer.disconnect()
    } catch (err) {
      this.logger.warn({ err }, 'BookingEventConsumer disconnect error')
    }
  }

  private async processMessage({ topic, message }: EachMessagePayload): Promise<void> {
    const raw = message.value?.toString()
    if (!raw) return

    let envelope: EventEnvelope
    try {
      envelope = JSON.parse(raw) as EventEnvelope
    } catch {
      this.logger.warn({ topic }, 'Skipping non-JSON message')
      return
    }

    try {
      await this.handleEvent(envelope)
    } catch (err) {
      this.logger.error({ err, eventType: envelope.eventType, aggregateId: envelope.aggregateId }, 'Failed to process booking event for notification')
    }
  }

  private async handleEvent(envelope: EventEnvelope): Promise<void> {
    const { eventType, organizationId, aggregateId, correlationId, payload } = envelope

    switch (eventType) {
      case 'booking.created': {
        const bookingNumber = typeof payload['bookingNumber'] === 'string' ? payload['bookingNumber'] : aggregateId
        const primaryGuestName = typeof payload['primaryGuestName'] === 'string' ? payload['primaryGuestName'] : 'Guest'
        const checkIn = typeof payload['checkIn'] === 'string' ? payload['checkIn'] : ''
        const checkOut = typeof payload['checkOut'] === 'string' ? payload['checkOut'] : ''
        await this.sendNotification.execute(
          {
            organizationId,
            notificationType: 'EMAIL',
            recipient: `booking-notifications@org-${organizationId}.stayflexi.internal`,
            subject: `Booking Confirmed: ${bookingNumber}`,
            message: `Booking ${bookingNumber} confirmed for ${primaryGuestName}. Check-in: ${checkIn}, Check-out: ${checkOut}.`,
            metadata: { bookingId: aggregateId, eventType },
          },
          correlationId,
        )
        break
      }
      case 'booking.cancelled': {
        const bookingNumber = typeof payload['bookingNumber'] === 'string' ? payload['bookingNumber'] : aggregateId
        await this.sendNotification.execute(
          {
            organizationId,
            notificationType: 'EMAIL',
            recipient: `booking-notifications@org-${organizationId}.stayflexi.internal`,
            subject: `Booking Cancelled: ${bookingNumber}`,
            message: `Booking ${bookingNumber} has been cancelled.`,
            metadata: { bookingId: aggregateId, eventType },
          },
          correlationId,
        )
        break
      }
      case 'payment.initiated': {
        const paymentRef = typeof payload['paymentReference'] === 'string' ? payload['paymentReference'] : aggregateId
        const amount = typeof payload['amount'] === 'number' ? payload['amount'] : 0
        const currency = typeof payload['currency'] === 'string' ? payload['currency'] : 'USD'
        await this.sendNotification.execute(
          {
            organizationId,
            notificationType: 'EMAIL',
            recipient: `payment-notifications@org-${organizationId}.stayflexi.internal`,
            subject: `Payment Initiated: ${paymentRef}`,
            message: `Payment of ${amount} ${currency} initiated. Reference: ${paymentRef}.`,
            metadata: { paymentId: aggregateId, eventType },
          },
          correlationId,
        )
        break
      }
      default:
        // Other events do not trigger notifications
        break
    }
  }
}
