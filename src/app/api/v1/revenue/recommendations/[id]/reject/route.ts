// FILE: src/app/api/v1/revenue/recommendations/[id]/reject/route.ts
import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withAuth } from '@modules/auth/middleware'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/v1/revenue/recommendations/[id]/reject
// Rejects a pricing recommendation, deleting it from active suggestions
export const POST = withAuth(async (req: NextRequest, { user }, context) => {
  try {
    const { id } = await (context as any).params
    const { revenueService } = await import('@modules/revenue/container')
    await revenueService.rejectRateRecommendation(id, user.organizationId ?? '')
    return successResponse({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
})
