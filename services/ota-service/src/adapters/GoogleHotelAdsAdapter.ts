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

export interface GoogleAriPriceRecord {
  propertyId: string
  roomTypeId: string
  ratePlanId: string
  checkInDate: string
  nights: number
  baseRate: number
  taxAmount: number
  feesAmount: number
  currency: string
  occupancy: number
  landingUrl?: string
}

export class GoogleHotelAdsAdapter extends BaseOtaAdapter {
  readonly providerCode = 'GOOGLE_HOTEL_ADS'

  constructor(logger: Logger) {
    super(logger)
  }

  async pushInventory(request: InventoryPushRequest): Promise<InventoryPushResponse> {
    this.logger.info(
      { hotelId: request.hotelId, roomCount: request.rooms.length },
      'Generating Google Hotel Prices inventory sync',
    )
    return {
      success: true,
      recordsProcessed: request.rooms.length,
      recordsFailed: 0,
      errors: [],
    }
  }

  async pushRates(request: RatePushRequest): Promise<RatePushResponse> {
    this.logger.info(
      { hotelId: request.hotelId, rateCount: request.rates.length },
      'Publishing rates to Google Hotel Prices feed',
    )
    return {
      success: true,
      recordsProcessed: request.rates.length,
      recordsFailed: 0,
      errors: [],
    }
  }

  async pullReservations(request: ReservationPullRequest): Promise<ReservationPullResponse> {
    this.logger.info({ hotelId: request.hotelId }, 'Pulling Google Free Booking Links reservations')
    return {
      success: true,
      reservations: [],
      errors: [],
    }
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    return Boolean(credentials['partnerId'] && credentials['clientSecret'])
  }

  normalizeWebhookPayload(rawPayload: unknown): NormalizedWebhookPayload {
    const payload = rawPayload as Record<string, unknown>
    return {
      eventType: String(payload['event'] ?? 'BOOKING_RECEIVED'),
      externalReservationId: String(payload['reservation_id'] ?? ''),
      hotelId: String(payload['property_id'] ?? ''),
      rawPayload,
    }
  }

  /**
   * Generates Google Hotel Prices Transaction Message XML conforming to Google's XSD schema.
   */
  generateGooglePricesXml(records: GoogleAriPriceRecord[], partnerId = 'stayflexi'): string {
    const timestamp = new Date().toISOString()
    const resultsXml = records
      .map((r) => {
        const total = (r.baseRate + r.taxAmount + r.feesAmount).toFixed(2)
        return `    <Result>
      <Property>${r.propertyId}</Property>
      <RoomID>${r.roomTypeId}</RoomID>
      <RatePlanID>${r.ratePlanId}</RatePlanID>
      <Checkin>${r.checkInDate}</Checkin>
      <Nights>${r.nights}</Nights>
      <Baserate currency="${r.currency}">${r.baseRate.toFixed(2)}</Baserate>
      <Tax currency="${r.currency}">${r.taxAmount.toFixed(2)}</Tax>
      <OtherFees currency="${r.currency}">${r.feesAmount.toFixed(2)}</OtherFees>
      <Occupancy>${r.occupancy}</Occupancy>
      <ChargeCurrency>${r.currency}</ChargeCurrency>
      <TotalRate>${total}</TotalRate>
      ${r.landingUrl ? `<CustomTag>${r.landingUrl}</CustomTag>` : ''}
    </Result>`
      })
      .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<Transaction timestamp="${timestamp}" id="txn-${Date.now()}" partner="${partnerId}">
${resultsXml}
</Transaction>`
  }

  /**
   * Generates deep-link landing URL for Google Hotel Free Booking Links.
   */
  buildDeepLinkUrl(
    baseUrl: string,
    params: {
      hotelId: string
      checkIn: string
      checkOut: string
      adults: number
      roomTypeId?: string
      ratePlanId?: string
      currency?: string
    },
  ): string {
    const url = new URL(`/hotels/${params.hotelId}/book`, baseUrl)
    url.searchParams.set('checkin', params.checkIn)
    url.searchParams.set('checkout', params.checkOut)
    url.searchParams.set('adults', String(params.adults))
    if (params.roomTypeId) url.searchParams.set('roomTypeId', params.roomTypeId)
    if (params.ratePlanId) url.searchParams.set('ratePlanId', params.ratePlanId)
    if (params.currency) url.searchParams.set('currency', params.currency)
    url.searchParams.set('utm_source', 'google_hotel_free_links')
    url.searchParams.set('utm_medium', 'metasearch')
    return url.toString()
  }
}
