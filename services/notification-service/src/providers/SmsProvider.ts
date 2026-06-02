import type { Logger } from '@stayflexi/shared-logger'
import type { INotificationProvider, NotificationRequest, NotificationResult } from './INotificationProvider'

// Phone number: starts with +, 7-15 digits
const PHONE_RE = /^\+?[1-9]\d{6,14}$/

export class SmsProvider implements INotificationProvider {
  readonly channelType = 'SMS'

  constructor(private readonly logger: Logger) {}

  validateRecipient(recipient: string): boolean {
    return PHONE_RE.test(recipient.replace(/[\s\-().]/g, ''))
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    if (!this.validateRecipient(request.recipient)) {
      return {
        success: false,
        errorMessage: `Invalid phone number for SMS: ${request.recipient}`,
      }
    }

    this.logger.info(
      {
        notificationId: request.notificationId,
        to: request.recipient,
        messageLength: request.message.length,
        organizationId: request.organizationId,
        correlationId: request.correlationId,
      },
      '[SmsProvider] Simulating Twilio SMS API call',
    )

    // Simulate Twilio SID
    const mockSid = `SM${request.notificationId.replace(/-/g, '').toUpperCase().slice(0, 32)}`

    this.logger.debug(
      { notificationId: request.notificationId, sid: mockSid, to: request.recipient },
      '[SmsProvider] SMS sent (simulation)',
    )

    return { success: true, providerMessageId: mockSid }
  }
}
