import type { INotificationRepository } from '../domain/repositories/INotificationRepository'
import type { ProviderFactory } from '../providers/ProviderFactory'
import type { Logger } from '@stayflexi/shared-logger'

export class NotificationRetryWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly providerFactory: ProviderFactory,
    private readonly logger: Logger,
    private readonly intervalMs = 60_000, // 1 minute
  ) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.logger.info({ intervalMs: this.intervalMs }, 'Notification retry worker started')

    this.timer = setInterval(() => {
      void this.processRetries().catch((err) => {
        this.logger.error({ err }, 'Notification retry tick failed')
      })
    }, this.intervalMs)

    // Allow the process to exit even if this interval is still active
    if (typeof this.timer.unref === 'function') {
      this.timer.unref()
    }
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.running = false
    this.logger.info('Notification retry worker stopped')
  }

  private async processRetries(): Promise<void> {
    const failed = await this.notificationRepo.findFailedForRetry(20)
    if (failed.length === 0) return

    this.logger.info({ count: failed.length }, 'Processing notification retries')

    for (const notification of failed) {
      try {
        await this.notificationRepo.incrementRetry(notification.id)
        await this.notificationRepo.updateStatus(notification.id, 'QUEUED')

        const provider = this.providerFactory.getProvider(notification.notificationType)
        const result = await provider.send({
          notificationId: notification.id,
          recipient: notification.recipient,
          subject: notification.subject ?? undefined,
          message: notification.message,
          organizationId: notification.organizationId,
        })

        if (result.success) {
          await this.notificationRepo.updateStatus(notification.id, 'DELIVERED', {
            deliveredAt: new Date(),
          })
          this.logger.info(
            { notificationId: notification.id },
            'Retry worker delivered notification',
          )
        } else {
          await this.notificationRepo.updateStatus(notification.id, 'FAILED', {
            failedReason: result.errorMessage ?? 'Provider error',
          })
          this.logger.warn(
            { notificationId: notification.id, error: result.errorMessage },
            'Retry worker: notification failed again',
          )
        }
      } catch (err) {
        this.logger.error(
          { notificationId: notification.id, err },
          'Retry worker: error processing notification',
        )
        // Attempt to mark as failed without crashing the loop
        await this.notificationRepo
          .updateStatus(notification.id, 'FAILED', {
            failedReason: err instanceof Error ? err.message : 'Retry worker error',
          })
          .catch(() => {
            // Best-effort
          })
      }
    }
  }
}
