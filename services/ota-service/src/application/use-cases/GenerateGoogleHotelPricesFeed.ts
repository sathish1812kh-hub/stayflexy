import type { Logger } from '@stayflexi/shared-logger'
import type { IOtaMappingRepository } from '../../domain/repositories/IOtaMappingRepository'
import type { IOtaProviderRepository } from '../../domain/repositories/IOtaProviderRepository'
import {
  GoogleHotelAdsAdapter,
  type GoogleAriPriceRecord,
} from '../../adapters/GoogleHotelAdsAdapter'

export interface GenerateGoogleFeedInput {
  hotelId: string
  organizationId?: string
  dateFrom: string
  dateTo: string
  rates: Array<{
    roomTypeId: string
    ratePlanId: string
    date: string
    baseRate: number
    taxAmount?: number
    feesAmount?: number
    currency?: string
    occupancy?: number
  }>
  baseUrl?: string
}

export interface GoogleFeedOutput {
  hotelId: string
  recordCount: number
  generatedAt: string
  xmlFeed: string
  records: GoogleAriPriceRecord[]
}

export class GenerateGoogleHotelPricesFeed {
  private readonly googleAdapter: GoogleHotelAdsAdapter

  constructor(
    private readonly providerRepo: IOtaProviderRepository,
    private readonly mappingRepo: IOtaMappingRepository,
    private readonly logger: Logger,
  ) {
    this.googleAdapter = new GoogleHotelAdsAdapter(logger)
  }

  async execute(input: GenerateGoogleFeedInput): Promise<GoogleFeedOutput> {
    this.logger.info(
      { hotelId: input.hotelId, dateFrom: input.dateFrom, dateTo: input.dateTo },
      'Generating real-time Google Hotel Prices ARI feed',
    )

    const baseUrl = input.baseUrl ?? 'https://stayflexi.com'
    const records: GoogleAriPriceRecord[] = input.rates.map((r) => {
      const checkInDate = r.date
      const currency = r.currency ?? 'USD'
      const occupancy = r.occupancy ?? 2
      const taxAmount = r.taxAmount ?? Number((r.baseRate * 0.1).toFixed(2))
      const feesAmount = r.feesAmount ?? 0

      const checkInObj = new Date(checkInDate)
      const checkOutObj = new Date(checkInObj.getTime() + 86400000)
      const checkOutDate = checkOutObj.toISOString().split('T')[0] ?? checkInDate

      const landingUrl = this.googleAdapter.buildDeepLinkUrl(baseUrl, {
        hotelId: input.hotelId,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: occupancy,
        roomTypeId: r.roomTypeId,
        ratePlanId: r.ratePlanId,
        currency,
      })

      return {
        propertyId: input.hotelId,
        roomTypeId: r.roomTypeId,
        ratePlanId: r.ratePlanId,
        checkInDate,
        nights: 1,
        baseRate: r.baseRate,
        taxAmount,
        feesAmount,
        currency,
        occupancy,
        landingUrl,
      }
    })

    const xmlFeed = this.googleAdapter.generateGooglePricesXml(records)

    return {
      hotelId: input.hotelId,
      recordCount: records.length,
      generatedAt: new Date().toISOString(),
      xmlFeed,
      records,
    }
  }
}
