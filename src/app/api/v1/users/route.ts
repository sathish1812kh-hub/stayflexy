import { type NextRequest } from 'next/server'
import { prisma } from '@lib/prisma'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { ConflictError } from '@errors/HttpError'
import { withPermission } from '@modules/auth/middleware'
import { RBACService } from '@modules/auth/services/RBACService'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const rbacService = new RBACService()

const InviteUserDto = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  roleId: z.string().uuid().optional(),
  hotelId: z.string().uuid().optional().nullable(),
})

// GET /api/v1/users — list users scoped to caller's organization
export const GET = withPermission('user', 'read', async (req: NextRequest, { user }) => {
  try {
    const orgId = user.organizationId
    const isSuperAdmin = user.role === 'SUPER_ADMIN'

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(isSuperAdmin ? {} : orgId ? { organizationId: orgId } : { id: user.id }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        primaryRole: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        organizationId: true,
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                isSystem: true,
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(users)
  } catch (error) {
    return handleRouteError(error)
  }
})

// POST /api/v1/users — invite/create a new staff user in caller's organization
export const POST = withPermission('user', 'create', async (req: NextRequest, { user }) => {
  try {
    const body = (await req.json()) as unknown
    const validated = InviteUserDto.parse(body)

    const existing = await prisma.user.findUnique({
      where: { email: validated.email },
    })
    if (existing) {
      throw new ConflictError('User with this email already exists')
    }

    const defaultPasswordHash = await bcrypt.hash('Stayflexi@2026!', 10)

    const newUser = await prisma.user.create({
      data: {
        email: validated.email,
        firstName: validated.firstName,
        lastName: validated.lastName,
        passwordHash: defaultPasswordHash,
        organizationId: user.organizationId ?? undefined,
        status: 'ACTIVE',
      },
    })

    // Assign initial role if provided
    if (validated.roleId) {
      await rbacService.assignRole(
        {
          userId: newUser.id,
          roleId: validated.roleId,
          organizationId: user.organizationId ?? undefined,
          hotelId: validated.hotelId ?? undefined,
        },
        user.id,
      )
    }

    const createdUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        primaryRole: true,
        status: true,
        organizationId: true,
        createdAt: true,
      },
    })

    return successResponse(createdUser, 201)
  } catch (error) {
    return handleRouteError(error)
  }
})
