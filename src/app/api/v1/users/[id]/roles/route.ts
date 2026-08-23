import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withPermission } from '@modules/auth/middleware'
import { RBACService } from '@modules/auth/services/RBACService'
import { AssignRoleDto } from '@modules/auth/dto'

const rbacService = new RBACService()

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/users/[id]/roles — list assigned roles for user
export const GET = withPermission<RouteParams>(
  'user_role',
  'read',
  async (req: NextRequest, { user }, context) => {
    try {
      const { id } = await context!.params
      const userRoles = await rbacService.listUserRoles(id, user.organizationId ?? undefined)
      return successResponse(userRoles)
    } catch (error) {
      return handleRouteError(error)
    }
  },
)

// POST /api/v1/users/[id]/roles — assign a role to user
export const POST = withPermission<RouteParams>(
  'user_role',
  'assign',
  async (req: NextRequest, { user }, context) => {
    try {
      const { id } = await context!.params
      const body = (await req.json()) as unknown
      const validated = AssignRoleDto.parse({
        ...(typeof body === 'object' && body !== null ? body : {}),
        userId: id,
        organizationId: user.organizationId ?? undefined,
      })

      await rbacService.assignRole(validated, user.id)
      const updatedRoles = await rbacService.listUserRoles(id, user.organizationId ?? undefined)
      return successResponse(updatedRoles, 201)
    } catch (error) {
      return handleRouteError(error)
    }
  },
)
