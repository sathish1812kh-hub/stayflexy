import { type NextRequest } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@lib/prisma'
import { successResponse } from '@utils/apiResponse'
import { handleRouteError } from '@middleware/errorHandler'
import { BadRequestError } from '@errors/HttpError'
import { AcceptInviteDto } from '@modules/auth/dto'
import { tokenService } from '@modules/auth/container'
import type { AuthenticatedUser } from '@modules/auth/types'

// POST /api/v1/auth/accept-invite — complete tokenized user onboarding
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown
    const validated = AcceptInviteDto.parse(body)

    const tokenHash = crypto.createHash('sha256').update(validated.token).digest('hex')

    const passwordHash = await bcrypt.hash(validated.password, 12)

    const user = await prisma.$transaction(async (tx) => {
      // 1. Atomic conditional update inside the transaction (prevents token burning on failure)
      const updateResult = await tx.userInvitation.updateMany({
        where: {
          tokenHash,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          acceptedAt: new Date(),
        },
      })

      if (updateResult.count !== 1) {
        throw new BadRequestError('Invalid, expired, or already consumed invitation token')
      }

      // 2. Fetch invitation details
      const invitation = await tx.userInvitation.findUnique({
        where: { tokenHash },
      })

      if (!invitation) {
        throw new BadRequestError('Invitation not found')
      }

      // 3. Prevent cross-org account takeover or re-onboarding of active accounts
      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email },
      })

      if (existingUser) {
        if (existingUser.status === 'ACTIVE') {
          throw new BadRequestError('Account is already active. Please log in directly.')
        }
        if (
          existingUser.organizationId &&
          existingUser.organizationId !== invitation.organizationId
        ) {
          throw new BadRequestError('Account belongs to a different organization.')
        }
      }

      let activeUser
      if (existingUser) {
        activeUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            phone: validated.phone ?? existingUser.phone,
            primaryRole: invitation.roleType,
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
            organizationId: invitation.organizationId,
          },
        })
      } else {
        activeUser = await tx.user.create({
          data: {
            email: invitation.email,
            passwordHash,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            phone: validated.phone,
            primaryRole: invitation.roleType,
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
            organizationId: invitation.organizationId,
          },
        })
      }

      // Create organization membership record
      await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: activeUser.id,
          },
        },
        update: { removedAt: null },
        create: {
          organizationId: invitation.organizationId,
          userId: activeUser.id,
          isOwner: false,
        },
      })

      // Assign initial role
      if (invitation.roleId) {
        await tx.userRole.create({
          data: {
            userId: activeUser.id,
            roleId: invitation.roleId,
            organizationId: invitation.organizationId,
          },
        })
      } else {
        // Find default system role corresponding to roleType
        const systemRole = await tx.role.findFirst({
          where: {
            name: {
              contains: invitation.roleType.replace('_', ' '),
              mode: 'insensitive',
            },
            isSystem: true,
          },
        })
        if (systemRole) {
          await tx.userRole.create({
            data: {
              userId: activeUser.id,
              roleId: systemRole.id,
              organizationId: invitation.organizationId,
            },
          })
        }
      }

      return activeUser
    })

    // 4. Issue authenticated tokens
    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.primaryRole,
      status: user.status,
      organizationId: user.organizationId,
    }
    const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip')
    const userAgent = req.headers.get('user-agent')
    const tokens = await tokenService.issueTokenPair(authUser, {
      ipAddress,
      userAgent,
    })

    return successResponse(
      {
        user: authUser,
        tokens,
      },
      200,
    )
  } catch (error) {
    return handleRouteError(error)
  }
}
