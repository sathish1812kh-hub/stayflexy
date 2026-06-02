import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { PaymentCache } from '../../infrastructure/cache/PaymentCache'
import type { LedgerService } from '../../ledger/LedgerService'
import type { Refund } from '../../domain/entities/Refund'
import type { ProcessRefundDto } from '../dtos/payment.dto'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { RedisDistributedLock } from '../../infrastructure/locking/RedisDistributedLock'
import { randomUUID } from 'crypto'

export class ProcessRefund {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly cache: PaymentCache,
    private readonly ledger: LedgerService,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
    private readonly lock?: RedisDistributedLock
  ) {}

  async execute(paymentId: string, dto: ProcessRefundDto, organizationId: string, userId: string, correlationId?: string): Promise<Refund> {
    // Lock per paymentId prevents concurrent refunds from racing
    const resource = `refund:payment:${paymentId}`
    const execute = async (): Promise<Refund> => {
      const payment = await this.paymentRepo.findById(paymentId)
      if (!payment) throw new NotFoundError('Payment not found')
      if (!payment.belongsToOrganization(organizationId)) throw new ForbiddenError('Access denied')
      if (!payment.canBeRefunded) {
        throw new BadRequestError(
          `Cannot refund payment with status "${payment.paymentStatus}". Only SUCCESS or PARTIALLY_REFUNDED payments can be refunded.`
        )
      }

      if (dto.refundAmount <= 0) throw new BadRequestError('Refund amount must be greater than zero')
      if (dto.refundAmount > payment.amount) {
        throw new BadRequestError(`Refund amount (${dto.refundAmount}) cannot exceed payment amount (${payment.amount})`)
      }

      // Re-read inside the lock to prevent TOCTOU race
      const alreadyRefunded = await this.paymentRepo.getTotalRefunded(paymentId)
      const maxRefundable = payment.amount - alreadyRefunded
      if (dto.refundAmount > maxRefundable) {
        throw new BadRequestError(
          `Refund amount (${dto.refundAmount}) exceeds remaining refundable amount (${maxRefundable})`
        )
      }

      const refundReference = `REF-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`

      const refund = await this.paymentRepo.createRefund({
        paymentId,
        refundReference,
        refundAmount: dto.refundAmount,
        refundReason: dto.refundReason,
        processedById: userId,
      })

      const newTotalRefunded = alreadyRefunded + dto.refundAmount
      const newStatus = newTotalRefunded >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
      await this.paymentRepo.updateStatus(paymentId, newStatus, { refundedAt: new Date() })

      await this.paymentRepo.addAuditEntry(
        paymentId, 'REFUND_SUCCESS',
        `Refund of ${dto.refundAmount} ${payment.currency} processed`,
        userId,
        { refundId: refund.id, refundAmount: dto.refundAmount, reason: dto.refundReason }
      )

      await this.ledger.recordRefund(
        organizationId, payment.hotelId, paymentId, refund.id,
        dto.refundAmount, payment.currency, userId, correlationId
      ).catch(err => this.logger.error({ err, paymentId, refundId: refund.id }, 'Ledger refund recording failed'))

      await this.cache.invalidatePayment(paymentId)

      this.eventPublisher.publish('payment.events', {
        eventType: 'payment.refunded',
        aggregateId: paymentId,
        aggregateType: 'Payment',
        organizationId,
        correlationId,
        payload: {
          paymentId, refundId: refund.id, bookingId: payment.bookingId,
          refundAmount: dto.refundAmount, currency: payment.currency,
          refundReason: dto.refundReason, newPaymentStatus: newStatus,
        },
      }).catch(err => this.logger.warn({ err }, 'Failed to publish payment.refunded'))

      this.logger.info({ paymentId, refundId: refund.id, refundAmount: dto.refundAmount, correlationId }, 'Refund processed')
      return refund
    }

    if (this.lock) {
      return this.lock.withLock(resource, execute, { ttlMs: 20000, retries: 3 })
    }
    return execute()
  }
}
