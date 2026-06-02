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
 * MakeMyTrip (MMT) Extranet API adapter (simulation).
 * Real endpoints:
 *   - Inventory: POST https://api.makemytrip.com/extranet/v1/inventory
 *   - Rates:     POST https://api.makemytrip.com/extranet/v1/rates
 *   - Reservations: GET https://api.makemytrip.com/extranet/v1/bookings
 */
export class MakeMyTripAdapter extends BaseOtaAdapter {
  readonly providerCode = 'MAKE_MY_TRIP'

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
        'MakeMyTrip inventory push (simulation)',
      )
      // Real: POST https://api.makemytrip.com/extranet/v1/inventory
      // Headers: X-MMT-API-Key, X-MMT-Secret
      return {
        success: true,
        recordsProcessed: request.rooms.length,
        recordsFailed: 0,
        errors: [],
      }
    }, 'MakeMyTrip.pushInventory')
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
        'MakeMyTrip rate push (simulation)',
      )
      // Real: POST https://api.makemytrip.com/extranet/v1/rates
      return {
        success: true,
        recordsProcessed: request.rates.length,
        recordsFailed: 0,
        errors: [],
      }
    }, 'MakeMyTrip.pushRates')
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
        'MakeMyTrip reservation pull (simulation)',
      )
      // Real: GET https://api.makemytrip.com/extranet/v1/bookings?hotel_id={id}&from_date=...
      return {
        success: true,
        reservations: [],
        errors: [],
      }
    }, 'MakeMyTrip.pullReservations')
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    // MMT requires: apiKey + secret + hotelCode
    const apiKey = credentials['apiKey']
    const secret = credentials['secret']
    const hotelCode = credentials['hotelCode']
    if (!apiKey || !secret || !hotelCode) return false
    this.logger.debug({ providerCode: this.providerCode, hotelCode }, 'Validating MakeMyTrip credentials')
    return true
  }

  normalizeWebhookPayload(rawPayload: unknown): NormalizedWebhookPayload {
    const payload = rawPayload as Record<string, unknown>
    return {
      eventType: String(payload['event_type'] ?? 'UNKNOWN'),
      externalReservationId: payload['booking_reference'] !== undefined
        ? String(payload['booking_reference'])
        : undefined,
      hotelId: payload['hotel_code'] !== undefined ? String(payload['hotel_code']) : undefined,
      rawPayload,
    }
  }
}
