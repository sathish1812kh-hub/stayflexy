import type { Logger } from '@stayflexi/shared-logger'
import type {
  IOtaAdapter,
  InventoryPushRequest,
  InventoryPushResponse,
  RatePushRequest,
  RatePushResponse,
  ReservationPullRequest,
  ReservationPullResponse,
  NormalizedWebhookPayload,
} from './IOtaAdapter'

export abstract class BaseOtaAdapter implements IOtaAdapter {
  abstract readonly providerCode: string
  protected readonly maxRetries = 3

  constructor(protected readonly logger: Logger) {}

  abstract pushInventory(request: InventoryPushRequest): Promise<InventoryPushResponse>
  abstract pushRates(request: RatePushRequest): Promise<RatePushResponse>
  abstract pullReservations(request: ReservationPullRequest): Promise<ReservationPullResponse>
  abstract validateCredentials(credentials: Record<string, string>): Promise<boolean>
  abstract normalizeWebhookPayload(rawPayload: unknown): NormalizedWebhookPayload

  protected async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries = this.maxRetries,
  ): Promise<T> {
    let lastError: Error | undefined
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000)
          this.logger.warn(
            { context, attempt, delayMs, providerCode: this.providerCode },
            'OTA adapter retry',
          )
          await new Promise<void>(resolve => setTimeout(resolve, delayMs))
        }
      }
    }
    throw lastError ?? new Error(`${context} failed after ${maxRetries} retries`)
  }

  protected isRateLimited(statusCode: number): boolean {
    return statusCode === 429
  }

  protected isServerError(statusCode: number): boolean {
    return statusCode >= 500
  }
}
