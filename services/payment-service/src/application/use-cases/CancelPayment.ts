import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { PaymentCache } from '../../infrastructure/cache/PaymentCache'
import type { Payment } from '../../domain/entities/Payment'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { RedisDistributedLock } from '../../infrastructure/locking/RedisDistributedLock'

export class CancelPayment {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly cache: PaymentCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
    private readonly lock?: RedisDistributedLock
  ) {}

  async execute(
    paymentId: string,
    reason: string | undefined,
    organizationId: string,
    userId: string,
    correlationId?: string
  ): Promise<Payment> {
    const resource = `payment:cancel:${paymentId}`

    const perform = async (): Promise<Payment> => {
      const payment = await this.paymentRepo.findById(paymentId)
      if (!payment) throw new NotFoundError('Payment not found')
      if (!payment.belongsToOrganization(organizationId)) throw new ForbiddenError('Access denied')

      if (!payment.canBeCancelled) {
        throw new BadRequestError(
          `Cannot cancel payment with status "${payment.paymentStatus}". Only PENDING or AUTHORIZED payments can be cancelled.`
        )
      }

      const cancelled = await this.paymentRepo.updateStatus(paymentId, 'CANCELLED', {
        failureReason: reason ?? 'Cancelled by user',
      })

      await this.paymentRepo.addAuditEntry(
        paymentId,
        'VOIDED',
        `Payment cancelled: ${reason ?? 'No reason provided'}`,
        userId,
        { reason, cancelledAt: new Date().toISOString() }
      )

      await this.cache.invalidatePayment(paymentId)

      this.eventPublisher.publish('payment.events', {
        eventType: 'payment.cancelled',
        aggregateId: paymentId,
        aggregateType: 'Payment',
        organizationId,
        correlationId,
        payload: {
          paymentId,
          bookingId: payment.bookingId,
          reason,
        },
      }).catch((err: unknown) => this.logger.warn({ err }, 'Failed to publish payment.cancelled'))

      this.logger.info({ paymentId, organizationId, reason, correlationId }, 'Payment cancelled')
      return cancelled
    }

    if (this.lock) {
      return this.lock.withLock(resource, perform, { ttlMs: 15000, retries: 3 })
    }
    return perform()
  }
}
