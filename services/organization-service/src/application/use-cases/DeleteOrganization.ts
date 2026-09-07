import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { OrganizationCache } from '../services/OrganizationCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

export class DeleteOrganization {
  constructor(
    private readonly orgRepo: IOrganizationRepository,
    private readonly cache: OrganizationCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(
    id: string,
    requestingUserId: string,
    requestingOrgId: string | null,
    correlationId?: string,
  ): Promise<void> {
    if (requestingOrgId && requestingOrgId !== id)
      throw new ForbiddenError('Access denied', 'ORG_ACCESS_DENIED')
    const org = await this.orgRepo.findById(id)
    if (!org || org.isDeleted) throw new NotFoundError('Organization not found')
    if (!org.isOwnedBy(requestingUserId))
      throw new ForbiddenError('Only owner can delete organization', 'NOT_OWNER')
    await this.orgRepo.softDelete(id)
    await this.cache.invalidate(id)
    void this.eventPublisher
      .publish('organization.events', {
        eventType: 'organization.deleted',
        aggregateId: id,
        aggregateType: 'Organization',
        organizationId: id,
        correlationId,
        payload: { organizationId: id, deletedBy: requestingUserId },
      })
      .catch((err: unknown) => this.logger.warn({ err }, 'Failed to publish organization.deleted'))
    this.logger.info({ orgId: id, requestingUserId, correlationId }, 'Organization soft-deleted')
  }
}
