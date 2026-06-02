import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs'
import type { Logger } from '@stayflexi/shared-logger'
import type { IPaymentRepository } from '../domain/repositories/IPaymentRepository'
import type { PaymentConfig } from '../config'

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
  private started = false

  constructor(
    private readonly logger: Logger,
    private readonly paymentRepo: IPaymentRepository,
    kafka: Kafka,
    groupId = 'payment-service-booking-consumer'
  ) {
    this.consumer = kafka.consumer({ groupId, sessionTimeout: 30000 })
  }

  static createKafka(config: PaymentConfig): Kafka {
    return new Kafka({
      clientId: 'payment-service-consumer',
      brokers: config.KAFKA_BROKERS.split(',').map(b => b.trim()),
      retry: { retries: 5, initialRetryTime: 1000 },
      connectionTimeout: 5000,
    })
  }

  async start(): Promise<void> {
    if (this.started) return
    await this.consumer.connect()
    await this.consumer.subscribe({ topics: ['booking.events'], fromBeginning: false })
    this.started = true
    this.logger.info('BookingEventConsumer started — subscribed to booking.events')

    this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessage(payload)
      },
    }).catch(err => {
      this.logger.error({ err }, 'BookingEventConsumer run-loop error')
    })
  }

  async stop(): Promise<void> {
    if (!this.started) return
    this.started = false
    try {
      await this.consumer.disconnect()
      this.logger.info('BookingEventConsumer stopped')
    } catch (err) {
      this.logger.warn({ err }, 'BookingEventConsumer disconnect error')
    }
  }

  private async processMessage({ topic, partition, message }: EachMessagePayload): Promise<void> {
    const raw = message.value?.toString()
    if (!raw) return

    let envelope: EventEnvelope
    try {
      envelope = JSON.parse(raw) as EventEnvelope
    } catch {
      this.logger.warn({ topic, partition, offset: message.offset }, 'Skipping non-JSON booking event')
      return
    }

    try {
      await this.handleEvent(envelope)
    } catch (err) {
      this.logger.error(
        { err, eventType: envelope.eventType, aggregateId: envelope.aggregateId, topic },
        'Failed to handle booking event in payment service'
      )
      // Do not re-throw: let Kafka move to next offset (dead-letter handling is external)
    }
  }

  private async handleEvent(envelope: EventEnvelope): Promise<void> {
    const { eventType, organizationId, aggregateId, correlationId } = envelope

    switch (eventType) {
      case 'booking.cancelled': {
        // Check for any SUCCESS payments linked to this cancelled booking
        const result = await this.paymentRepo.findByOrganization({
          organizationId,
          bookingId: aggregateId,
          paymentStatus: 'SUCCESS',
          page: 1,
          limit: 10,
        })

        if (result.data.length > 0) {
          this.logger.warn(
            {
              bookingId: aggregateId,
              organizationId,
              correlationId,
              paymentIds: result.data.map(p => p.id),
            },
            'Booking cancelled with collected payments — manual refund review required'
          )
          // Audit each payment with the cancellation notice
          for (const payment of result.data) {
            await this.paymentRepo.addAuditEntry(
              payment.id,
              'RECONCILED',
              `Booking ${aggregateId} cancelled — payment may require manual refund review`,
              'system',
              { bookingId: aggregateId, cancelledAt: new Date().toISOString(), correlationId }
            ).catch(err => {
              this.logger.warn({ err, paymentId: payment.id }, 'Failed to add cancellation audit entry')
            })
          }
        }
        break
      }

      case 'booking.created': {
        this.logger.debug(
          { bookingId: aggregateId, organizationId, correlationId },
          'Booking created — payment context noted'
        )
        break
      }

      default:
        break
    }
  }
}
