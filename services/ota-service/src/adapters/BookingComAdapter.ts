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
 * Booking.com ARI (Availability, Rates & Inventory) adapter.
 * Real endpoints (when credentials available):
 *   - Inventory: POST https://supply-xml.booking.com/hotels/ota/OTA_HotelAvailNotif
 *   - Rates:     POST https://supply-xml.booking.com/hotels/ota/OTA_HotelRateAmountNotif
 *   - Reservations: GET https://supply-xml.booking.com/hotels/json/reservations
 */
export class BookingComAdapter extends BaseOtaAdapter {
  readonly providerCode = 'BOOKING_COM'

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
        'Booking.com inventory push (simulation)',
      )
      // Real: POST https://supply-xml.booking.com/hotels/ota/OTA_HotelAvailNotif
      // Body: OTA_HotelAvailNotifRQ XML with room availability blocks
      return {
        success: true,
        recordsProcessed: request.rooms.length,
        recordsFailed: 0,
        errors: [],
      }
    }, 'BookingCom.pushInventory')
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
        'Booking.com rate push (simulation)',
      )
      // Real: POST https://supply-xml.booking.com/hotels/ota/OTA_HotelRateAmountNotif
      return {
        success: true,
        recordsProcessed: request.rates.length,
        recordsFailed: 0,
        errors: [],
      }
    }, 'BookingCom.pushRates')
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
        'Booking.com reservation pull (simulation)',
      )
      // Real: GET https://supply-xml.booking.com/hotels/json/reservations
      // Params: hotel_id, arrival_date_from, arrival_date_to, changed_since
      return {
        success: true,
        reservations: [],
        errors: [],
      }
    }, 'BookingCom.pullReservations')
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    // Booking.com requires: apiKey (username) + propertyId
    const apiKey = credentials['apiKey']
    const propertyId = credentials['propertyId']
    if (!apiKey || !propertyId) return false
    // Real: test call to https://supply-xml.booking.com/hotels/json/getHotels
    this.logger.debug({ providerCode: this.providerCode, propertyId }, 'Validating Booking.com credentials')
    return true
  }

  normalizeWebhookPayload(rawPayload: unknown): NormalizedWebhookPayload {
    const payload = rawPayload as Record<string, unknown>
    return {
      eventType: String(payload['type'] ?? 'UNKNOWN'),
      externalReservationId: payload['reservation_id'] !== undefined
        ? String(payload['reservation_id'])
        : undefined,
      hotelId: payload['hotel_id'] !== undefined ? String(payload['hotel_id']) : undefined,
      rawPayload,
    }
  }
}
