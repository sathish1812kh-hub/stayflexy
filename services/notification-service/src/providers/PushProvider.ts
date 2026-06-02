import type { Logger } from '@stayflexi/shared-logger'
import type { INotificationProvider, NotificationRequest, NotificationResult } from './INotificationProvider'

export class PushProvider implements INotificationProvider {
  // Handles both PUSH and IN_APP channels
  readonly channelType = 'PUSH'

  constructor(private readonly logger: Logger) {}

  validateRecipient(recipient: string): boolean {
    // Push recipients can be user IDs, device tokens, or topic strings
    return recipient.length > 0 && recipient.length <= 512
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    if (!this.validateRecipient(request.recipient)) {
      return {
        success: false,
        errorMessage: `Invalid push recipient: ${request.recipient}`,
      }
    }

    this.logger.info(
      {
        notificationId: request.notificationId,
        to: request.recipient,
        title: request.subject ?? '(no title)',
        messageLength: request.message.length,
        organizationId: request.organizationId,
        correlationId: request.correlationId,
      },
      '[PushProvider] Simulating FCM/APNs push notification',
    )

    // Simulate Firebase message ID
    const mockMessageId = `projects/stayflexi/messages/${request.notificationId}`

    this.logger.debug(
      { notificationId: request.notificationId, messageId: mockMessageId },
      '[PushProvider] Push notification sent (simulation)',
    )

    return { success: true, providerMessageId: mockMessageId }
  }
}
