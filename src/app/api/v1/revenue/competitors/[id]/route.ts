// FILE: src/app/api/v1/revenue/competitors/[id]/route.ts
import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withAuth } from '@modules/auth/middleware'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/v1/revenue/competitors/[id]
// Updates a competitor hotel
export const PATCH = withAuth(async (req: NextRequest, { user }, context) => {
  try {
    const { id } = await (context as any).params
    const body = (await req.json()) as unknown
    const v = await import('@modules/revenue/validators')
    const dto = v.validateUpdateCompetitorHotel(body)
    const { revenueService } = await import('@modules/revenue/container')
    const result = await revenueService.updateCompetitorHotel(id, dto, user.organizationId ?? '')
    return successResponse(result)
  } catch (error) {
    return handleRouteError(error)
  }
})

// DELETE /api/v1/revenue/competitors/[id]
// Deletes a competitor hotel mapping
export const DELETE = withAuth(async (req: NextRequest, { user }, context) => {
  try {
    const { id } = await (context as any).params
    const { revenueService } = await import('@modules/revenue/container')
    await revenueService.deleteCompetitorHotel(id, user.organizationId ?? '')
    return successResponse({ success: true })
  } catch (error) {
    return handleRouteError(error)
  }
})
