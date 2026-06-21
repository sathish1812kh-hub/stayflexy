// FILE: src/app/api/v1/revenue/competitors/route.ts
import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withAuth } from '@modules/auth/middleware'

// GET /api/v1/revenue/competitors?hotelId=...
// Lists all competitor hotels for a stayflexi hotel
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const hotelId = req.nextUrl.searchParams.get('hotelId')
    if (!hotelId) {
      return successResponse({ error: 'Missing hotelId parameter' }, 400)
    }
    const { revenueService } = await import('@modules/revenue/container')
    const result = await revenueService.listCompetitorHotels(hotelId, user.organizationId ?? '')
    return successResponse(result)
  } catch (error) {
    return handleRouteError(error)
  }
})

// POST /api/v1/revenue/competitors
// Creates a competitor hotel mapping
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = (await req.json()) as unknown
    const v = await import('@modules/revenue/validators')
    const dto = v.validateCreateCompetitorHotel(body)
    const { revenueService } = await import('@modules/revenue/container')
    const result = await revenueService.createCompetitorHotel(dto, user.organizationId ?? '')
    return successResponse(result, 201)
  } catch (error) {
    return handleRouteError(error)
  }
})
