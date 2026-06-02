import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { OrganizationCache } from '../services/OrganizationCache'
import type { Organization } from '../../domain/entities/Organization'

export class GetOrganization {
  constructor(
    private readonly orgRepo: IOrganizationRepository,
    private readonly cache: OrganizationCache
  ) {}

  async execute(id: string, requestingOrgId: string | null): Promise<Organization> {
    // Tenant isolation: regular users can only access their own org.
    // SUPER_ADMIN routes pass null for requestingOrgId (handled at gateway).
    if (requestingOrgId && requestingOrgId !== id) {
      throw new ForbiddenError(
        'Access denied to this organization',
        'ORG_ACCESS_DENIED'
      )
    }

    // Try cache first
    const cached = await this.cache.get(id)
    if (cached) return cached

    const org = await this.orgRepo.findById(id)
    if (!org || org.isDeleted) {
      throw new NotFoundError('Organization not found')
    }

    // Populate cache
    await this.cache.set(org)
    return org
  }
}
