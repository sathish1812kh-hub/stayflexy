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
 * Expedia Partner Solutions (EPS) adapter (simulation).
 * Real endpoints (Expedia Rapid API):
 *   - Inventory: PUT https://api.ean.com/v3/properties/{propertyId}/room-types/{roomTypeId}/rate-plans/{ratePlanId}/availability
 *   - Rates:     PUT https://api.ean.com/v3/properties/{propertyId}/room-types/{roomTypeId}/rate-plans/{ratePlanId}/rates
 *   - Reservations: GET https://api.ean.com/v3/properties/{propertyId}/reservations
 */
export class ExpediaAdapter extends BaseOtaAdapter {
  readonly providerCode = 'EXPEDIA'

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
        'Expedia inventory push (simulation)',
      )
      // Real: PUT https://api.ean.com/v3/properties/{propertyId}/room-types/{roomTypeId}/rate-plans/{ratePlanId}/availability
      return {
        success: true,
        recordsProcessed: request.rooms.length,
        recordsFailed: 0,
        errors: [],
      }
    }, 'Expedia.pushInventory')
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
        'Expedia rate push (simulation)',
      )
      // Real: PUT https://api.ean.com/v3/properties/{propertyId}/room-types/{roomTypeId}/rate-plans/{ratePlanId}/rates
      return {
        success: true,
        recordsProcessed: request.rates.length,
        recordsFailed: 0,
        errors: [],
      }
    }, 'Expedia.pushRates')
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
        'Expedia reservation pull (simulation)',
      )
      // Real: GET https://api.ean.com/v3/properties/{propertyId}/reservations?arrival_start_date=...
      return {
        success: true,
        reservations: [],
        errors: [],
      }
    }, 'Expedia.pullReservations')
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    // Expedia requires: apiKey + secret + propertyId
    const apiKey = credentials['apiKey']
    const secret = credentials['secret']
    const propertyId = credentials['propertyId']
    if (!apiKey || !secret || !propertyId) return false
    this.logger.debug({ providerCode: this.providerCode, propertyId }, 'Validating Expedia credentials')
    return true
  }

  normalizeWebhookPayload(rawPayload: unknown): NormalizedWebhookPayload {
    const payload = rawPayload as Record<string, unknown>
    return {
      eventType: String(payload['event'] ?? 'UNKNOWN'),
      externalReservationId: payload['booking_id'] !== undefined
        ? String(payload['booking_id'])
        : undefined,
      hotelId: payload['property_id'] !== undefined ? String(payload['property_id']) : undefined,
      rawPayload,
    }
  }
}
