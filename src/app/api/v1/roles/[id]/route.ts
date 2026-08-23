import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withPermission } from '@modules/auth/middleware'
import { RBACService } from '@modules/auth/services/RBACService'
import { UpdateRoleDto } from '@modules/auth/dto'

const rbacService = new RBACService()

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/roles/[id] — get role details with permissions
export const GET = withPermission<RouteParams>(
  'role',
  'read',
  async (req: NextRequest, { user }, context) => {
    try {
      const { id } = await context!.params
      const role = await rbacService.findRoleWithPermissions(id, user.organizationId ?? undefined)
      return successResponse(role)
    } catch (error) {
      return handleRouteError(error)
    }
  },
)

// PATCH /api/v1/roles/[id] — update custom role
export const PATCH = withPermission<RouteParams>(
  'role',
  'update',
  async (req: NextRequest, { user }, context) => {
    try {
      const { id } = await context!.params
      const body = (await req.json()) as unknown
      const validated = UpdateRoleDto.parse(body)

      const updated = await rbacService.updateRole(id, validated, user.organizationId ?? undefined)
      return successResponse(updated)
    } catch (error) {
      return handleRouteError(error)
    }
  },
)

// DELETE /api/v1/roles/[id] — delete custom role
export const DELETE = withPermission<RouteParams>(
  'role',
  'delete',
  async (req: NextRequest, { user }, context) => {
    try {
      const { id } = await context!.params
      await rbacService.deleteRole(id, user.organizationId ?? undefined)
      return successResponse({ deleted: true })
    } catch (error) {
      return handleRouteError(error)
    }
  },
)
