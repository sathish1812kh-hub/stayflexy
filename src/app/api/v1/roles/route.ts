import { type NextRequest } from 'next/server'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { withPermission } from '@modules/auth/middleware'
import { RBACService } from '@modules/auth/services/RBACService'
import { CreateRoleDto } from '@modules/auth/dto'

const rbacService = new RBACService()

// GET /api/v1/roles — list system roles + org custom roles
export const GET = withPermission('role', 'read', async (req: NextRequest, { user }) => {
  try {
    const roles = await rbacService.listRoles(user.organizationId ?? undefined)
    return successResponse(roles)
  } catch (error) {
    return handleRouteError(error)
  }
})

// POST /api/v1/roles — create a custom role for current organization
export const POST = withPermission('role', 'create', async (req: NextRequest, { user }) => {
  try {
    const body = (await req.json()) as unknown
    const validated = CreateRoleDto.parse(body)

    const role = await rbacService.createRole({
      ...validated,
      organizationId: user.organizationId ?? undefined,
    })

    return successResponse(role, 201)
  } catch (error) {
    return handleRouteError(error)
  }
})
