import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { OrganizationCache } from '../services/OrganizationCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import { ORG_EVENTS } from '@stayflexi/shared-events'
import type { UpdateOrgDto } from '../dtos/organization.dto'
import type { Organization } from '../../domain/entities/Organization'
import type { Logger } from '@stayflexi/shared-logger'

export class UpdateOrganization {
  constructor(
    private readonly orgRepo: IOrganizationRepository,
    private readonly cache: OrganizationCache,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    id: string,
    dto: UpdateOrgDto,
    requestingUserId: string,
    requestingOrgId: string | null,
    correlationId?: string
  ): Promise<Organization> {
    // Tenant isolation
    if (requestingOrgId && requestingOrgId !== id) {
      throw new ForbiddenError('Access denied', 'ORG_ACCESS_DENIED')
    }

    const org = await this.orgRepo.findById(id)
    if (!org || org.isDeleted) {
      throw new NotFoundError('Organization not found')
    }

    // Only owner can update org details
    if (!org.isOwnedBy(requestingUserId)) {
      throw new ForbiddenError(
        'Only the organization owner can update organization details',
        'NOT_OWNER'
      )
    }

    const updated = await this.orgRepo.update(id, dto)
    await this.cache.invalidate(id)

    this.eventPublisher
      .publish('organization.events', {
        eventType: ORG_EVENTS.ORGANIZATION_UPDATED,
        aggregateId: id,
        aggregateType: 'Organization',
        organizationId: id,
        correlationId,
        payload: {
          organizationId: id,
          updatedFields: Object.keys(dto),
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish organization.updated event')
      })

    this.logger.info({ orgId: id, requestingUserId, correlationId }, 'Organization updated')
    return updated
  }
}
