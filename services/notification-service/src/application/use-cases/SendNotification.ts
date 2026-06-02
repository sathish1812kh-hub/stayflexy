import { createHash } from 'crypto'
import type { INotificationRepository } from '../../domain/repositories/INotificationRepository'
import type { ITemplateRepository } from '../../domain/repositories/ITemplateRepository'
import type { ProviderFactory } from '../../providers/ProviderFactory'
import type { TemplateRenderer } from '../../templates/TemplateRenderer'
import type { NotificationCache } from '../../infrastructure/cache/NotificationCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { SendNotificationDto } from '../dtos/notification.dto'
import type { Notification } from '../../domain/entities/Notification'
import type { Logger } from '@stayflexi/shared-logger'

export class SendNotification {
  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly templateRepo: ITemplateRepository,
    private readonly providerFactory: ProviderFactory,
    private readonly templateRenderer: TemplateRenderer,
    private readonly cache: NotificationCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(dto: SendNotificationDto, correlationId?: string): Promise<Notification> {
    // Resolve message from template if provided
    let finalMessage = dto.message
    let finalSubject: string | null = dto.subject ?? null

    if (dto.templateId !== undefined) {
      const template = await this.templateRepo.findById(dto.templateId)
      if (template !== null && template.isActive) {
        const rendered = this.templateRenderer.renderNotification(
          template.bodyTemplate,
          template.subjectTemplate,
          dto.templateVariables ?? {},
        )
        finalMessage = rendered.body
        finalSubject = rendered.subject ?? finalSubject
      }
    }

    // Deduplication check
    const messageHash = createHash('sha256')
      .update(finalMessage + dto.recipient)
      .digest('hex')
      .slice(0, 16)
    const isDuplicate = await this.cache.checkDedup(dto.organizationId, dto.recipient, messageHash)
    if (isDuplicate) {
      this.logger.warn(
        { recipient: dto.recipient, organizationId: dto.organizationId },
        'Duplicate notification suppressed',
      )
    }

    // Create notification record (always, even if duplicate — record is kept for auditing)
    const notification = await this.notificationRepo.create({
      organizationId: dto.organizationId,
      hotelId: dto.hotelId,
      notificationType: dto.notificationType,
      recipient: dto.recipient,
      subject: finalSubject ?? undefined,
      message: finalMessage,
      maxRetries: dto.maxRetries ?? 3,
      scheduledAt: dto.scheduledAt !== undefined ? new Date(dto.scheduledAt) : undefined,
      metadata: dto.metadata,
    })

    // If not scheduled, send immediately (fire-and-forget via setImmediate)
    if (dto.scheduledAt === undefined) {
      setImmediate(() => {
        void this.deliverNotification(
          notification.id,
          dto.notificationType,
          dto.recipient,
          finalSubject,
          finalMessage,
          dto.organizationId,
          correlationId,
        )
      })
    }

    return notification
  }

  private async deliverNotification(
    notificationId: string,
    channelType: string,
    recipient: string,
    subject: string | null,
    message: string,
    organizationId: string,
    correlationId?: string,
  ): Promise<void> {
    try {
      await this.notificationRepo.updateStatus(notificationId, 'QUEUED')
      const provider = this.providerFactory.getProvider(channelType)
      const result = await provider.send({
        notificationId,
        recipient,
        subject: subject ?? undefined,
        message,
        organizationId,
        correlationId,
      })

      if (result.success) {
        await this.notificationRepo.updateStatus(notificationId, 'DELIVERED', {
          deliveredAt: new Date(),
        })
        this.logger.info(
          { notificationId, channelType, recipient },
          'Notification delivered successfully',
        )
        setImmediate(() => {
          void (async () => {
            try {
              await this.eventPublisher.publish('notification.events', {
                eventType: 'notification.sent',
                aggregateId: notificationId,
                aggregateType: 'Notification',
                organizationId,
                correlationId,
                payload: { notificationId, channelType, recipient, correlationId },
              })
            } catch {
              // fire-and-forget — event publish failure must not crash delivery
            }
          })()
        })
      } else {
        await this.notificationRepo.updateStatus(notificationId, 'FAILED', {
          failedReason: result.errorMessage ?? 'Provider error',
        })
        this.logger.warn(
          { notificationId, channelType, error: result.errorMessage },
          'Notification delivery failed',
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delivery error'
      await this.notificationRepo
        .updateStatus(notificationId, 'FAILED', { failedReason: errorMessage })
        .catch(() => {
          // Best-effort status update — suppress secondary errors
        })
      this.logger.error({ notificationId, err }, 'Notification delivery error')
    }
  }
}
