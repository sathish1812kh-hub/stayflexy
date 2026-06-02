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
 * Airbnb iCal / API2 adapter (simulation).
 * Real endpoints:
 *   - Availability: PUT https://api.airbnb.com/v2/listings/{listing_id}/availability_rules
 *   - Pricing:      PUT https://api.airbnb.com/v2/listings/{listing_id}/pricing_settings
 *   - Reservations: GET https://api.airbnb.com/v2/reservations
 */
export class AirbnbAdapter extends BaseOtaAdapter {
  readonly providerCode = 'AIRBNB'

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
        'Airbnb inventory push (simulation)',
      )
      // Real: PUT https://api.airbnb.com/v2/listings/{listing_id}/availability_rules
      // Airbnb uses calendar blocking per listing (each room = listing)
      return {
        success: true,
        recordsProcessed: request.rooms.length,
        recordsFailed: 0,
        errors: [],
      }
    }, 'Airbnb.pushInventory')
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
        'Airbnb rate push (simulation)',
      )
      // Real: PUT https://api.airbnb.com/v2/listings/{listing_id}/pricing_settings
      return {
        success: true,
        recordsProcessed: request.rates.length,
        recordsFailed: 0,
        errors: [],
      }
    }, 'Airbnb.pushRates')
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
        'Airbnb reservation pull (simulation)',
      )
      // Real: GET https://api.airbnb.com/v2/reservations?listing_id={id}&start_date=...
      return {
        success: true,
        reservations: [],
        errors: [],
      }
    }, 'Airbnb.pullReservations')
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    // Airbnb requires: accessToken + clientId
    const accessToken = credentials['accessToken']
    const clientId = credentials['clientId']
    if (!accessToken || !clientId) return false
    this.logger.debug({ providerCode: this.providerCode }, 'Validating Airbnb credentials')
    return true
  }

  normalizeWebhookPayload(rawPayload: unknown): NormalizedWebhookPayload {
    const payload = rawPayload as Record<string, unknown>
    return {
      eventType: String(payload['event_type'] ?? 'UNKNOWN'),
      externalReservationId: payload['reservation_id'] !== undefined
        ? String(payload['reservation_id'])
        : undefined,
      hotelId: payload['listing_id'] !== undefined ? String(payload['listing_id']) : undefined,
      rawPayload,
    }
  }
}
