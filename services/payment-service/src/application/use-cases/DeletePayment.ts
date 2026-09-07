import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { PaymentCache } from '../../infrastructure/cache/PaymentCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

export class DeletePayment {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly cache: PaymentCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    userId: string,
    correlationId?: string,
  ): Promise<void> {
    const payment = await this.paymentRepo.findById(id)
    if (!payment) throw new NotFoundError('Payment not found')
    if (!payment.belongsToOrganization(organizationId)) throw new ForbiddenError('Access denied')
    if (!payment.canBeCancelled)
      throw new BadRequestError('Only PENDING or AUTHORIZED payments can be deleted/cancelled')
    await this.paymentRepo.updateStatus(id, 'CANCELLED', {
      failureReason: 'Deleted via DELETE endpoint',
    })
    await this.cache.invalidatePayment(id)
    void this.eventPublisher
      .publish('payment.events', {
        eventType: 'payment.cancelled',
        aggregateId: id,
        aggregateType: 'Payment',
        organizationId,
        correlationId,
        payload: { paymentId: id, deletedBy: userId },
      })
      .catch((err: unknown) => this.logger.warn({ err }, 'Failed to publish payment.deleted'))
    this.logger.info({ paymentId: id, organizationId }, 'Payment soft-deleted via cancel')
  }
}
