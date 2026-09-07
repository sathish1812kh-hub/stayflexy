import type { PrismaClient } from '@stayflexi/shared-database'
import type {
  IInvitationRepository,
  UserInvitationRecord,
} from '../../domain/repositories/IInvitationRepository'
import { ConflictError } from '@stayflexi/shared-errors'

export class PrismaInvitationRepository implements IInvitationRepository {
  constructor(private readonly db: PrismaClient) {}

  async createInvitation(data: {
    email: string
    firstName: string
    lastName: string
    roleType: string
    roleId?: string | null
    organizationId: string
    invitedById: string | null
    tokenHash: string
    expiresAt: Date
  }): Promise<UserInvitationRecord> {
    const existingUser = await this.db.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser && existingUser.status === 'ACTIVE') {
      throw new ConflictError('A user with this email address is already active.')
    }

    const invitation = await this.db.userInvitation.upsert({
      where: { tokenHash: data.tokenHash },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        roleType: data.roleType as any,
        roleId: data.roleId ?? null,
        expiresAt: data.expiresAt,
        acceptedAt: null,
      },
      create: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        roleType: data.roleType as any,
        roleId: data.roleId ?? null,
        organizationId: data.organizationId,
        invitedById: data.invitedById ?? null,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    })

    return {
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      roleType: invitation.roleType,
      roleId: invitation.roleId,
      organizationId: invitation.organizationId,
      invitedById: invitation.invitedById,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      createdAt: invitation.createdAt,
    }
  }

  async listInvitations(
    orgId: string,
    limit = 50,
    cursor?: string,
  ): Promise<UserInvitationRecord[]> {
    const invitations = await this.db.userInvitation.findMany({
      where: { organizationId: orgId },
      take: Math.min(limit, 100),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
    })

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      firstName: inv.firstName,
      lastName: inv.lastName,
      roleType: inv.roleType,
      roleId: inv.roleId,
      organizationId: inv.organizationId,
      invitedById: inv.invitedById,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
      createdAt: inv.createdAt,
    }))
  }

  async getInvitationByHash(tokenHash: string): Promise<UserInvitationRecord | null> {
    const inv = await this.db.userInvitation.findUnique({
      where: { tokenHash },
    })
    if (!inv) return null

    return {
      id: inv.id,
      email: inv.email,
      firstName: inv.firstName,
      lastName: inv.lastName,
      roleType: inv.roleType,
      roleId: inv.roleId,
      organizationId: inv.organizationId,
      invitedById: inv.invitedById,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
      createdAt: inv.createdAt,
    }
  }
}
