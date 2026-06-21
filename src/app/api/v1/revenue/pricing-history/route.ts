// FILE: src/app/api/v1/revenue/pricing-history/route.ts
import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withAuth } from '@modules/auth/middleware'

// GET /api/v1/revenue/pricing-history?hotelId=...
// Lists all price changes logged in the pricing audit log
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const hotelId = req.nextUrl.searchParams.get('hotelId')
    if (!hotelId) {
      return successResponse({ error: 'Missing hotelId parameter' }, 400)
    }
    const { revenueService } = await import('@modules/revenue/container')
    const result = await revenueService.getPricingAuditLogs(hotelId, user.organizationId ?? '')
    return successResponse(result)
  } catch (error) {
    return handleRouteError(error)
  }
})
