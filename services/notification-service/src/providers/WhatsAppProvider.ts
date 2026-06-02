import type { Logger } from '@stayflexi/shared-logger'
import type { INotificationProvider, NotificationRequest, NotificationResult } from './INotificationProvider'

// WhatsApp uses E.164 phone numbers
const PHONE_RE = /^\+?[1-9]\d{6,14}$/

export class WhatsAppProvider implements INotificationProvider {
  readonly channelType = 'WHATSAPP'

  constructor(private readonly logger: Logger) {}

  validateRecipient(recipient: string): boolean {
    const cleaned = recipient.replace(/[\s\-().]/g, '')
    return PHONE_RE.test(cleaned)
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    if (!this.validateRecipient(request.recipient)) {
      return {
        success: false,
        errorMessage: `Invalid phone number for WhatsApp: ${request.recipient}`,
      }
    }

    this.logger.info(
      {
        notificationId: request.notificationId,
        to: `whatsapp:${request.recipient}`,
        messageLength: request.message.length,
        organizationId: request.organizationId,
        correlationId: request.correlationId,
      },
      '[WhatsAppProvider] Simulating WhatsApp Business API call',
    )

    // Simulate Twilio WhatsApp message SID
    const mockSid = `WA${request.notificationId.replace(/-/g, '').toUpperCase().slice(0, 32)}`

    this.logger.debug(
      { notificationId: request.notificationId, sid: mockSid },
      '[WhatsAppProvider] WhatsApp message sent (simulation)',
    )

    return { success: true, providerMessageId: mockSid }
  }
}
