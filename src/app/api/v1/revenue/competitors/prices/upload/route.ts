// FILE: src/app/api/v1/revenue/competitors/prices/upload/route.ts
import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withAuth } from '@modules/auth/middleware'

// POST /api/v1/revenue/competitors/prices/upload
// Manually upload competitor prices
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = (await req.json()) as unknown
    const v = await import('@modules/revenue/validators')
    const dto = v.validateUploadCompetitorPrices(body)
    const { revenueService } = await import('@modules/revenue/container')
    const result = await revenueService.uploadCompetitorPrices(dto, user.organizationId ?? '')
    return successResponse(result, 201)
  } catch (error) {
    return handleRouteError(error)
  }
})
