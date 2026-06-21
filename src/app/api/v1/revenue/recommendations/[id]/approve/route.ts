// FILE: src/app/api/v1/revenue/recommendations/[id]/approve/route.ts
import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withAuth } from '@modules/auth/middleware'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST /api/v1/revenue/recommendations/[id]/approve
// Approves a pricing recommendation, writing to DynamicRate and logging to PricingAuditLog
export const POST = withAuth(async (req: NextRequest, { user }, context) => {
  try {
    const { id } = await (context as any).params
    const { revenueService } = await import('@modules/revenue/container')
    const result = await revenueService.approveRateRecommendation(
      id,
      user.id,
      user.organizationId ?? ''
    )
    return successResponse(result)
  } catch (error) {
    return handleRouteError(error)
  }
})
