import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withPermission } from '@modules/auth/middleware'
import { RBACService } from '@modules/auth/services/RBACService'

const rbacService = new RBACService()

interface RouteParams {
  params: Promise<{ id: string; userRoleId: string }>
}

// DELETE /api/v1/users/[id]/roles/[userRoleId] — revoke role assignment
export const DELETE = withPermission<RouteParams>(
  'user_role',
  'revoke',
  async (req: NextRequest, { user }, context) => {
    try {
      const { userRoleId } = await context!.params
      await rbacService.revokeRole(userRoleId)
      return successResponse({ revoked: true })
    } catch (error) {
      return handleRouteError(error)
    }
  },
)
