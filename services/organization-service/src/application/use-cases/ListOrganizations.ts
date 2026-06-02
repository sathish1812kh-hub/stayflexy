import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { PaginatedResult } from '@stayflexi/shared-types'
import type { Organization } from '../../domain/entities/Organization'
import type { ListOrgsDto } from '../dtos/organization.dto'

export class ListOrganizations {
  constructor(private readonly orgRepo: IOrganizationRepository) {}

  async execute(
    dto: ListOrgsDto,
    requestingUserId: string,
    requestingRole: string
  ): Promise<PaginatedResult<Organization>> {
    // SUPER_ADMIN can list all orgs; regular users only see their own
    const isSuperAdmin = requestingRole === 'SUPER_ADMIN'

    return this.orgRepo.findMany({
      ownerId: isSuperAdmin ? undefined : requestingUserId,
      status: dto.status,
      plan: dto.plan,
      page: dto.page,
      limit: dto.limit,
    })
  }
}
