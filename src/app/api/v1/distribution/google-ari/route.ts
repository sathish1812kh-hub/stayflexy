import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@lib/prisma'
import { successResponse, errorResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'

// GET /api/v1/distribution/google-ari?hotelId=&dateFrom=&dateTo=&format=xml|json
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const hotelId = searchParams.get('hotelId')
    const format = searchParams.get('format') ?? 'xml'
    const dateFrom = searchParams.get('dateFrom') ?? new Date().toISOString().split('T')[0]!
    const dateTo =
      searchParams.get('dateTo') ??
      new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]!

    if (!hotelId) {
      return errorResponse('BAD_REQUEST', 'Missing required parameter: hotelId', 400)
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        roomTypes: {
          where: { deletedAt: null },
        },
      },
    })

    if (!hotel) {
      return errorResponse('NOT_FOUND', 'Hotel not found', 404)
    }

    const host = req.headers.get('host') ?? 'stayflexi.com'
    const protocol = req.headers.get('x-forwarded-proto') ?? 'https'
    const baseUrl = `${protocol}://${host}`

    const results = hotel.roomTypes.map((rt) => {
      const baseRate = Number(rt.basePrice)
      const taxAmount = Number((baseRate * 0.1).toFixed(2))
      const feesAmount = 0
      const total = (baseRate + taxAmount + feesAmount).toFixed(2)

      const landingUrl = `${baseUrl}/hotels/${hotelId}/book?checkin=${dateFrom}&checkout=${dateTo}&adults=${rt.maxOccupancy}&roomTypeId=${rt.id}&utm_source=google_hotel_free_links&utm_medium=metasearch`

      return {
        propertyId: hotelId,
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        ratePlanId: 'standard-best-rate',
        checkInDate: dateFrom,
        nights: 1,
        baseRate,
        taxAmount,
        feesAmount,
        totalRate: Number(total),
        currency: 'USD',
        occupancy: rt.maxOccupancy,
        landingUrl,
      }
    })

    if (format === 'xml') {
      const timestamp = new Date().toISOString()
      const xmlItems = results
        .map(
          (r) => `    <Result>
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
      <TotalRate>${r.totalRate.toFixed(2)}</TotalRate>
      <CustomTag>${r.landingUrl}</CustomTag>
    </Result>`,
        )
        .join('\n')

      const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<Transaction timestamp="${timestamp}" id="txn-google-${Date.now()}" partner="stayflexi">
${xmlItems}
</Transaction>`

      return new NextResponse(xmlBody, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      })
    }

    return successResponse({
      hotelId,
      hotelName: hotel.name,
      recordCount: results.length,
      generatedAt: new Date().toISOString(),
      records: results,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
