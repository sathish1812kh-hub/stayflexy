import { ConflictError } from '@stayflexi/shared-errors'
import type { IEventPublisher } from '@stayflexi/shared-events'
import { ORG_EVENTS } from '@stayflexi/shared-events'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'
import type { CreateOrgDto } from '../dtos/organization.dto'
import type { Organization } from '../../domain/entities/Organization'
import type { Logger } from '@stayflexi/shared-logger'

export class CreateOrganization {
  constructor(
    private readonly orgRepo: IOrganizationRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    dto: CreateOrgDto,
    requestingUserId: string,
    correlationId?: string
  ): Promise<Organization> {
    // Generate slug from name if not provided
    const slug =
      dto.slug ??
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 64)

    // Check slug uniqueness
    const existingBySlug = await this.orgRepo.findBySlug(slug)
    if (existingBySlug) {
      throw new ConflictError(`Slug "${slug}" is already taken`, 'SLUG_CONFLICT')
    }

    // Check if user already owns an org
    const existingOrg = await this.orgRepo.findByOwnerId(requestingUserId)
    if (existingOrg) {
      throw new ConflictError('You already own an organization', 'ALREADY_OWNER')
    }

    // Create organization
    const org = await this.orgRepo.create({
      name: dto.name,
      legalName: dto.legalName,
      slug,
      email: dto.email,
      phone: dto.phone,
      website: dto.website,
      country: dto.country,
      ownerId: requestingUserId,
      createdById: requestingUserId,
    })

    // Add creator as owner member
    await this.memberRepo.create({
      organizationId: org.id,
      userId: requestingUserId,
      isOwner: true,
    })

    // Publish event (fire-and-forget — never block the response)
    this.eventPublisher
      .publish('organization.events', {
        eventType: ORG_EVENTS.ORGANIZATION_CREATED,
        aggregateId: org.id,
        aggregateType: 'Organization',
        organizationId: org.id,
        correlationId,
        payload: {
          organizationId: org.id,
          name: org.name,
          slug: org.slug,
          ownerId: org.ownerId,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish organization.created event')
      })

    this.logger.info(
      { orgId: org.id, ownerId: requestingUserId, correlationId },
      'Organization created'
    )
    return org
  }
}
