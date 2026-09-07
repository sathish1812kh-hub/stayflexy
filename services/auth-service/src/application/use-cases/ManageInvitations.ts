import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import type {
  IInvitationRepository,
  UserInvitationRecord,
} from '../../domain/repositories/IInvitationRepository'
import type { IRBACRepository } from '../../domain/repositories/IRBACRepository'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { TokenService } from '../services/TokenService'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from '@stayflexi/shared-errors'
import type { PrismaClient } from '@stayflexi/shared-database'

export interface InviteUserResult {
  id: string
  email: string
  organizationId: string
  expiresAt: Date
  invitationToken?: string
  inviteLink?: string
}

export class ManageInvitations {
  constructor(
    private readonly invitationRepo: IInvitationRepository,
    private readonly rbacRepo: IRBACRepository,
    private readonly userRepo: IUserRepository,
    private readonly tokenService: TokenService,
    private readonly db: PrismaClient,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async listInvitations(
    orgId: string,
    limit?: number,
    cursor?: string,
  ): Promise<UserInvitationRecord[]> {
    return this.invitationRepo.listInvitations(orgId, limit, cursor)
  }

  async inviteUser(
    data: {
      email: string
      firstName: string
      lastName: string
      roleType?: string
      roleId?: string | null
    },
    context: {
      userId: string | null
      organizationId: string | null
      primaryRole: string | null
      isServiceCall: boolean
    },
  ): Promise<InviteUserResult> {
    if (!context.userId && !context.isServiceCall) {
      throw new UnauthorizedError('Authentication required')
    }

    if (!context.organizationId && !context.isServiceCall) {
      throw new ValidationError('Organization context required to issue invitations')
    }

    const userPermissions = context.userId
      ? await this.rbacRepo.getUserPermissions(context.userId, context.organizationId)
      : []
    const hasPerm =
      context.isServiceCall ||
      context.primaryRole === 'SUPER_ADMIN' ||
      context.primaryRole === 'ORG_ADMIN' ||
      userPermissions.includes('user:create') ||
      userPermissions.includes('user:*') ||
      userPermissions.includes('*')

    if (!hasPerm) {
      throw new ForbiddenError(
        'You do not have permission to issue user invitations (user:create required)',
      )
    }

    const orgId = context.organizationId!
    const roleType = data.roleType || 'FRONT_DESK'

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    const invitation = await this.invitationRepo.createInvitation({
      email: data.email.toLowerCase().trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      roleType,
      roleId: data.roleId ?? null,
      organizationId: orgId,
      invitedById: context.userId,
      tokenHash,
      expiresAt,
    })

    this.logger.info('User invitation issued', {
      invitationId: invitation.id,
      email: invitation.email,
      orgId,
      invitedBy: context.userId,
    })

    const isNonProd = process.env['NODE_ENV'] !== 'production'

    return {
      id: invitation.id,
      email: invitation.email,
      organizationId: invitation.organizationId,
      expiresAt: invitation.expiresAt,
      ...(isNonProd
        ? {
            invitationToken: rawToken,
            inviteLink: `/auth/accept-invite?token=${rawToken}`,
          }
        : {}),
    }
  }

  async acceptInvite(
    data: {
      token: string
      password: string
      phone?: string | null
    },
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    user: any
    tokens: { accessToken: string; refreshToken: string }
  }> {
    if (!data.token || data.token.trim().length === 0) {
      throw new ValidationError('Invitation token is required')
    }

    if (!data.password || data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long')
    }

    const tokenHash = crypto.createHash('sha256').update(data.token.trim()).digest('hex')
    const passwordHash = await bcrypt.hash(data.password, 12)

    const activeUser = await this.db.$transaction(async (tx) => {
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
        throw new ValidationError('Invalid, expired, or already consumed invitation token')
      }

      const invitation = await tx.userInvitation.findUnique({
        where: { tokenHash },
      })

      if (!invitation) {
        throw new NotFoundError('Invitation not found')
      }

      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email },
      })

      if (existingUser) {
        if (existingUser.status === 'ACTIVE') {
          throw new ConflictError('Account is already active. Please log in directly.')
        }
        if (
          existingUser.organizationId &&
          existingUser.organizationId !== invitation.organizationId
        ) {
          throw new ForbiddenError('Account belongs to a different organization.')
        }
      }

      let userRecord
      if (existingUser) {
        userRecord = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            phone: data.phone ?? existingUser.phone,
            primaryRole: invitation.roleType,
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
            organizationId: invitation.organizationId,
          },
        })
      } else {
        userRecord = await tx.user.create({
          data: {
            email: invitation.email,
            passwordHash,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            phone: data.phone ?? null,
            primaryRole: invitation.roleType,
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
            organizationId: invitation.organizationId,
          },
        })
      }

      await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: userRecord.id,
          },
        },
        update: { removedAt: null },
        create: {
          organizationId: invitation.organizationId,
          userId: userRecord.id,
          isOwner: false,
        },
      })

      if (invitation.roleId) {
        await tx.userRole.create({
          data: {
            userId: userRecord.id,
            roleId: invitation.roleId,
            organizationId: invitation.organizationId,
          },
        })
      } else {
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
              userId: userRecord.id,
              roleId: systemRole.id,
              organizationId: invitation.organizationId,
            },
          })
        }
      }

      return userRecord
    })

    const tokenPair = await this.tokenService.issueTokenPair(
      activeUser.id,
      activeUser.organizationId,
      activeUser.primaryRole,
      { ipAddress, userAgent },
      'GraphQL-AcceptInvite',
    )

    this.logger.info('User invitation accepted and account activated', {
      userId: activeUser.id,
      email: activeUser.email,
      orgId: activeUser.organizationId,
    })

    return {
      user: {
        userId: activeUser.id,
        email: activeUser.email,
        firstName: activeUser.firstName,
        lastName: activeUser.lastName,
        primaryRole: activeUser.primaryRole,
        organizationId: activeUser.organizationId,
        status: activeUser.status,
        createdAt: activeUser.createdAt.toISOString(),
      },
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
      },
    }
  }
}
