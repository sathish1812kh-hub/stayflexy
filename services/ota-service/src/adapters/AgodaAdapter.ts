import type { Logger } from '@stayflexi/shared-logger'
import { BaseOtaAdapter } from './BaseOtaAdapter'
import type {
  InventoryPushRequest,
  InventoryPushResponse,
  RatePushRequest,
  RatePushResponse,
  ReservationPullRequest,
  ReservationPullResponse,
  NormalizedWebhookPayload,
} from './IOtaAdapter'

/**
 * Agoda YCS (Yield Control System) adapter (simulation).
 * Real endpoints:
 *   - Inventory: POST https://ycs.agoda.com/api/inventory
 *   - Rates:     POST https://ycs.agoda.com/api/rates
 *   - Reservations: GET https://ycs.agoda.com/api/reservations
 */
export class AgodaAdapter extends BaseOtaAdapter {
  readonly providerCode = 'AGODA'

  constructor(logger: Logger) {
    super(logger)
  }

  async pushInventory(request: InventoryPushRequest): Promise<InventoryPushResponse> {
    return this.withRetry(async () => {
      this.logger.info(
        {
          providerCode: this.providerCode,
          externalHotelId: request.externalHotelId,
          roomCount: request.rooms.length,
          dateFrom: request.dateFrom,
          dateTo: request.dateTo,
          correlationId: request.correlationId,
        },
        'Agoda inventory push (simulation)',
      )
      // Real: POST https://ycs.agoda.com/api/inventory
      // Auth: apiKey header
      return {
        success: true,
        recordsProcessed: request.rooms.length,
        recordsFailed: 0,
        errors: [],
      }
    }, 'Agoda.pushInventory')
  }

  async pushRates(request: RatePushRequest): Promise<RatePushResponse> {
    return this.withRetry(async () => {
      this.logger.info(
        {
          providerCode: this.providerCode,
          externalHotelId: request.externalHotelId,
          rateCount: request.rates.length,
          dateFrom: request.dateFrom,
          dateTo: request.dateTo,
        },
        'Agoda rate push (simulation)',
      )
      // Real: POST https://ycs.agoda.com/api/rates
      return {
        success: true,
        recordsProcessed: request.rates.length,
        recordsFailed: 0,
        errors: [],
      }
    }, 'Agoda.pushRates')
  }

  async pullReservations(request: ReservationPullRequest): Promise<ReservationPullResponse> {
    return this.withRetry(async () => {
      this.logger.info(
        {
          providerCode: this.providerCode,
          externalHotelId: request.externalHotelId,
          dateFrom: request.dateFrom,
          dateTo: request.dateTo,
          correlationId: request.correlationId,
        },
        'Agoda reservation pull (simulation)',
      )
      // Real: GET https://ycs.agoda.com/api/reservations?hotel_id={id}&check_in_from=...
      return {
        success: true,
        reservations: [],
        errors: [],
      }
    }, 'Agoda.pullReservations')
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    // Agoda requires: apiKey + hotelId
    const apiKey = credentials['apiKey']
    const hotelId = credentials['hotelId']
    if (!apiKey || !hotelId) return false
    this.logger.debug({ providerCode: this.providerCode, hotelId }, 'Validating Agoda credentials')
    return true
  }

  normalizeWebhookPayload(rawPayload: unknown): NormalizedWebhookPayload {
    const payload = rawPayload as Record<string, unknown>
    return {
      eventType: String(payload['notification_type'] ?? 'UNKNOWN'),
      externalReservationId: payload['booking_id'] !== undefined
        ? String(payload['booking_id'])
        : undefined,
      hotelId: payload['hotel_id'] !== undefined ? String(payload['hotel_id']) : undefined,
      rawPayload,
    }
  }
}
