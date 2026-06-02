import { NotFoundError, ForbiddenError, ConflictError } from '@stayflexi/shared-errors'
import type { INotificationRepository } from '../../domain/repositories/INotificationRepository'
import type { ProviderFactory } from '../../providers/ProviderFactory'
import type { Notification } from '../../domain/entities/Notification'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

export class RetryNotification {
  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly providerFactory: ProviderFactory,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(notificationId: string, organizationId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findById(notificationId)
    if (!notification) {
      throw new NotFoundError(`Notification not found: ${notificationId}`)
    }
    if (!notification.belongsToOrganization(organizationId)) {
      throw new ForbiddenError('Access denied to this notification')
    }
    if (!notification.canRetry()) {
      throw new ConflictError(
        `Notification cannot be retried. Status: ${notification.deliveryStatus}, retries: ${notification.retryCount}/${notification.maxRetries}`,
      )
    }

    const updated = await this.notificationRepo.incrementRetry(notificationId)
    setImmediate(() => {
      void this.deliverRetry(updated, organizationId)
    })
    return updated
  }

  private async deliverRetry(notification: Notification, organizationId: string): Promise<void> {
    try {
      await this.notificationRepo.updateStatus(notification.id, 'QUEUED')
      const provider = this.providerFactory.getProvider(notification.notificationType)
      const result = await provider.send({
        notificationId: notification.id,
        recipient: notification.recipient,
        subject: notification.subject ?? undefined,
        message: notification.message,
        organizationId,
      })

      if (result.success) {
        await this.notificationRepo.updateStatus(notification.id, 'DELIVERED', {
          deliveredAt: new Date(),
        })
        this.logger.info(
          { notificationId: notification.id, channelType: notification.notificationType },
          'Notification retry delivered successfully',
        )
        setImmediate(() => {
          void (async () => {
            try {
              await this.eventPublisher.publish('notification.events', {
                eventType: 'notification.sent',
                aggregateId: notification.id,
                aggregateType: 'Notification',
                organizationId,
                payload: {
                  notificationId: notification.id,
                  channelType: notification.notificationType,
                  recipient: notification.recipient,
                  isRetry: true,
                },
              })
            } catch {
              // fire-and-forget
            }
          })()
        })
      } else {
        await this.notificationRepo.updateStatus(notification.id, 'FAILED', {
          failedReason: result.errorMessage ?? 'Provider error on retry',
        })
        this.logger.warn(
          { notificationId: notification.id, error: result.errorMessage },
          'Notification retry failed',
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Retry error'
      await this.notificationRepo
        .updateStatus(notification.id, 'FAILED', { failedReason: errorMessage })
        .catch(() => {
          // Best-effort
        })
      this.logger.error({ notificationId: notification.id, err }, 'Notification retry error')
    }
  }
}
