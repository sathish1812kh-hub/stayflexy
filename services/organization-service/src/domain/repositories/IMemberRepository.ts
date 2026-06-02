import type { Member } from '../entities/Member'

export interface CreateMemberData {
  organizationId: string
  userId: string
  isOwner?: boolean
}

export interface IMemberRepository {
  findByOrgAndUser(organizationId: string, userId: string): Promise<Member | null>
  findActiveByOrg(
    organizationId: string,
    page: number,
    limit: number
  ): Promise<{ members: Member[]; total: number }>
  create(data: CreateMemberData): Promise<Member>
  remove(organizationId: string, userId: string): Promise<void>
  countActiveByOrg(organizationId: string): Promise<number>
}
