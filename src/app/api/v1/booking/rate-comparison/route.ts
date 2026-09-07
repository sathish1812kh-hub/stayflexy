import { type NextRequest } from 'next/server'
import { prisma } from '@lib/prisma'
import { successResponse, errorResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'

// GET /api/v1/booking/rate-comparison?hotelId=&roomTypeId=&checkIn=&checkOut=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const hotelId = searchParams.get('hotelId')
    const roomTypeId = searchParams.get('roomTypeId')

    if (!hotelId) {
      return errorResponse('BAD_REQUEST', 'Missing required parameter: hotelId', 400)
    }

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        roomTypes: {
          where: {
            deletedAt: null,
            ...(roomTypeId ? { id: roomTypeId } : {}),
          },
        },
      },
    })

    if (!hotel || hotel.roomTypes.length === 0) {
      return errorResponse('NOT_FOUND', 'Hotel or Room Type not found', 404)
    }

    const comparisons = hotel.roomTypes.map((rt) => {
      const directPrice = Number(rt.basePrice)
      // OTA commission uplift (15% - 20% commission on average)
      const bookingComPrice = Number((directPrice * 1.18).toFixed(2))
      const expediaPrice = Number((directPrice * 1.2).toFixed(2))
      const agodaPrice = Number((directPrice * 1.17).toFixed(2))
      const directSavings = Number((bookingComPrice - directPrice).toFixed(2))
      const percentageSaved = Math.round(((bookingComPrice - directPrice) / bookingComPrice) * 100)

      return {
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        currency: 'USD',
        directPrice,
        otaRates: [
          { provider: 'Booking.com', price: bookingComPrice },
          { provider: 'Expedia', price: expediaPrice },
          { provider: 'Agoda', price: agodaPrice },
        ],
        directSavings,
        percentageSaved,
        bestPriceGuaranteed: true,
        urgencyMessage: 'Direct booking includes free cancellation & priority check-in',
        directPerks: [
          'Best Price Guaranteed (Save up to 18%)',
          'Free Early Check-in subject to availability',
          'Direct Guest Support & No Hidden OTA Booking Fees',
          'Instant Loyalty Points Earning',
        ],
      }
    })

    return successResponse({
      hotelId: hotel.id,
      hotelName: hotel.name,
      comparisons,
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
