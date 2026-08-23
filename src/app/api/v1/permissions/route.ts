import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withPermission } from '@modules/auth/middleware'
import { RBACService } from '@modules/auth/services/RBACService'

const rbacService = new RBACService()

// GET /api/v1/permissions — list all 118 catalog permissions
export const GET = withPermission('role', 'read', async (req: NextRequest) => {
  try {
    const resource = req.nextUrl.searchParams.get('resource') ?? undefined
    const permissions = await rbacService.listPermissions(resource)
    return successResponse(permissions)
  } catch (error) {
    return handleRouteError(error)
  }
})
