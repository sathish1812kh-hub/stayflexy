// FILE: src/app/api/v1/revenue/comparison/route.ts
import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withAuth } from '@modules/auth/middleware'

// GET /api/v1/revenue/comparison?hotelId=&roomTypeId=&checkInDate=
// Returns price comparison dashboard calculations
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import('@modules/revenue/validators')
    const query = v.validateComparisonQuery(Object.fromEntries(req.nextUrl.searchParams))
    const { revenueService } = await import('@modules/revenue/container')
    const result = await revenueService.compareRates(query, user.organizationId ?? '')
    return successResponse(result)
  } catch (error) {
    return handleRouteError(error)
  }
})
