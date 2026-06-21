// FILE: src/app/api/v1/revenue/recommendations/route.ts
import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withAuth } from '@modules/auth/middleware'

// GET /api/v1/revenue/recommendations?hotelId=...
// Lists all pricing rate recommendations for a hotel
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const hotelId = req.nextUrl.searchParams.get('hotelId')
    if (!hotelId) {
      return successResponse({ error: 'Missing hotelId parameter' }, 400)
    }
    const { revenueService } = await import('@modules/revenue/container')
    const result = await revenueService.listRateRecommendations(hotelId, user.organizationId ?? '')
    return successResponse(result)
  } catch (error) {
    return handleRouteError(error)
  }
})

// POST /api/v1/revenue/recommendations
// Body: { hotelId } — generates mock recommendations for 7 days
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const hotelId = body['hotelId'] as string
    if (!hotelId) {
      return successResponse({ error: 'Missing hotelId parameter' }, 400)
    }
    const { revenueService } = await import('@modules/revenue/container')
    await revenueService.generateMockRecommendations(hotelId, user.organizationId ?? '')
    return successResponse({ success: true, message: 'Mock recommendations generated successfully' }, 201)
  } catch (error) {
    return handleRouteError(error)
  }
})
