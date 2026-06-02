import { BadRequestError, ConflictError } from '@stayflexi/shared-errors'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { Payment } from '../../domain/entities/Payment'
import type { InitiatePaymentDto } from '../dtos/payment.dto'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { RedisDistributedLock } from '../../infrastructure/locking/RedisDistributedLock'
import { randomUUID } from 'crypto'

export class InitiatePayment {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
    private readonly lock?: RedisDistributedLock
  ) {}

  async execute(dto: InitiatePaymentDto, organizationId: string, userId: string, correlationId?: string): Promise<Payment> {
    if (dto.amount <= 0) throw new BadRequestError('Payment amount must be greater than zero')

    const paymentReference = `PAY-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`

    // Distributed lock per booking prevents concurrent duplicate initiations
    const resource = `payment:booking:${dto.bookingId}`
    const execute = async (): Promise<Payment> => {
      const payment = await this.paymentRepo.create({
        organizationId,
        hotelId: dto.hotelId,
        bookingId: dto.bookingId,
        paymentReference,
        paymentMethod: dto.paymentMethod,
        paymentProvider: dto.paymentProvider,
        transactionId: dto.transactionId,
        amount: dto.amount,
        currency: dto.currency,
        processedById: userId,
        metadata: dto.metadata,
      })

      this.eventPublisher.publish('payment.events', {
        eventType: 'payment.initiated',
        aggregateId: payment.id,
        aggregateType: 'Payment',
        organizationId,
        correlationId,
        payload: {
          paymentId: payment.id, paymentReference, bookingId: dto.bookingId,
          amount: dto.amount, currency: dto.currency, paymentMethod: dto.paymentMethod,
        },
      }).catch(err => this.logger.warn({ err }, 'Failed to publish payment.initiated'))

      this.logger.info({ paymentId: payment.id, paymentReference, organizationId, correlationId }, 'Payment initiated')
      return payment
    }

    if (this.lock) {
      return this.lock.withLock(resource, execute, { ttlMs: 15000, retries: 3 })
    }
    return execute()
  }
}
