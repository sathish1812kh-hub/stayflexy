export interface UserInvitationRecord {
  id: string
  email: string
  firstName: string
  lastName: string
  roleType: string
  roleId: string | null
  organizationId: string
  invitedById: string | null
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
}

export interface IInvitationRepository {
  createInvitation(data: {
    email: string
    firstName: string
    lastName: string
    roleType: string
    roleId?: string | null
    organizationId: string
    invitedById: string | null
    tokenHash: string
    expiresAt: Date
  }): Promise<UserInvitationRecord>
  listInvitations(orgId: string, limit?: number, cursor?: string): Promise<UserInvitationRecord[]>
  getInvitationByHash(tokenHash: string): Promise<UserInvitationRecord | null>
}
