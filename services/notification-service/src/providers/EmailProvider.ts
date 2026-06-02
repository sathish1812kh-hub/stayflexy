import type { Logger } from '@stayflexi/shared-logger'
import type { INotificationProvider, NotificationRequest, NotificationResult } from './INotificationProvider'

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 100

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class EmailProvider implements INotificationProvider {
  readonly channelType = 'EMAIL'

  constructor(private readonly logger: Logger) {}

  validateRecipient(recipient: string): boolean {
    return recipient.includes('@') && recipient.length > 3
  }

  async send(request: NotificationRequest): Promise<NotificationResult> {
    let lastError: string | undefined

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        this.logger.info(
          {
            notificationId: request.notificationId,
            to: request.recipient,
            subject: request.subject ?? '(no subject)',
            organizationId: request.organizationId,
            correlationId: request.correlationId,
            attempt,
          },
          '[EmailProvider] Simulating SMTP send',
        )

        if (!this.validateRecipient(request.recipient)) {
          return {
            success: false,
            errorMessage: `Invalid email address: ${request.recipient}`,
          }
        }

        // Simulate SMTP transmission
        const mockMessageId = `<${request.notificationId}.${Date.now()}@stayflexi.com>`

        this.logger.debug(
          {
            notificationId: request.notificationId,
            messageId: mockMessageId,
            to: request.recipient,
          },
          '[EmailProvider] Email delivered (simulation)',
        )

        return { success: true, providerMessageId: mockMessageId }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error'
        this.logger.warn(
          { notificationId: request.notificationId, attempt, error: lastError },
          '[EmailProvider] Attempt failed, retrying',
        )
        if (attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS * attempt)
        }
      }
    }

    return {
      success: false,
      errorMessage: lastError ?? 'Max retries exceeded',
    }
  }
}
