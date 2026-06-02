import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { PaymentCache } from '../../infrastructure/cache/PaymentCache'
import type { LedgerService } from '../../ledger/LedgerService'
import type { Payment } from '../../domain/entities/Payment'
import type { ConfirmPaymentDto } from '../dtos/payment.dto'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { RedisDistributedLock } from '../../infrastructure/locking/RedisDistributedLock'

export class ConfirmPayment {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly cache: PaymentCache,
    private readonly ledger: LedgerService,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
    private readonly lock?: RedisDistributedLock
  ) {}

  async execute(paymentId: string, dto: ConfirmPaymentDto, organizationId: string, userId: string, correlationId?: string): Promise<Payment> {
    const resource = `payment:confirm:${paymentId}`
    const execute = async (): Promise<Payment> => {
      const payment = await this.paymentRepo.findById(paymentId)
      if (!payment) throw new NotFoundError('Payment not found')
      if (!payment.belongsToOrganization(organizationId)) throw new ForbiddenError('Access denied')
      if (!payment.isPending) throw new BadRequestError(`Cannot confirm payment with status "${payment.paymentStatus}"`)

      const confirmed = await this.paymentRepo.updateStatus(paymentId, 'SUCCESS', {
        paidAt: new Date(),
        transactionId: dto.transactionId,
      })

      await this.paymentRepo.addAuditEntry(
        paymentId, 'SUCCESS', 'Payment confirmed successfully', userId,
        { transactionId: dto.transactionId, providerResponse: dto.providerResponse }
      )

      // Record in ledger — immutable financial record
      await this.ledger.recordPayment(
        organizationId, payment.hotelId, paymentId, payment.amount,
        payment.currency, userId, correlationId
      ).catch(err => this.logger.error({ err, paymentId }, 'Ledger recording failed'))

      await this.cache.invalidatePayment(paymentId)

      this.eventPublisher.publish('payment.events', {
        eventType: 'payment.completed',
        aggregateId: paymentId,
        aggregateType: 'Payment',
        organizationId,
        correlationId,
        payload: {
          paymentId, bookingId: payment.bookingId, amount: payment.amount,
          currency: payment.currency, paymentMethod: payment.paymentMethod,
          transactionId: dto.transactionId, paidAt: new Date().toISOString(),
        },
      }).catch(err => this.logger.warn({ err }, 'Failed to publish payment.completed'))

      this.logger.info({ paymentId, organizationId, correlationId }, 'Payment confirmed')
      return confirmed
    }

    if (this.lock) {
      return this.lock.withLock(resource, execute, { ttlMs: 15000, retries: 3 })
    }
    return execute()
  }
}
