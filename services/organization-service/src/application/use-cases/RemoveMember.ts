import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IEventPublisher } from '@stayflexi/shared-events'
import { ORG_EVENTS } from '@stayflexi/shared-events'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'
import type { Logger } from '@stayflexi/shared-logger'

export class RemoveMember {
  constructor(
    private readonly orgRepo: IOrganizationRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    orgId: string,
    targetUserId: string,
    requestingUserId: string,
    correlationId?: string
  ): Promise<void> {
    const org = await this.orgRepo.findById(orgId)
    if (!org || org.isDeleted) {
      throw new NotFoundError('Organization not found')
    }

    // Only the org owner can remove members
    if (!org.isOwnedBy(requestingUserId)) {
      throw new ForbiddenError(
        'Only the organization owner can remove members',
        'NOT_OWNER'
      )
    }

    // Owner cannot remove themselves
    if (targetUserId === requestingUserId) {
      throw new BadRequestError(
        'The organization owner cannot be removed. Transfer ownership first.'
      )
    }

    const member = await this.memberRepo.findByOrgAndUser(orgId, targetUserId)
    if (!member || !member.isActive) {
      throw new NotFoundError('Member not found in this organization')
    }

    await this.memberRepo.remove(orgId, targetUserId)

    this.eventPublisher
      .publish('organization.events', {
        eventType: ORG_EVENTS.MEMBER_REMOVED,
        aggregateId: orgId,
        aggregateType: 'Organization',
        organizationId: orgId,
        correlationId,
        payload: {
          organizationId: orgId,
          userId: targetUserId,
          removedBy: requestingUserId,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish member.removed event')
      })

    this.logger.info(
      { orgId, targetUserId, requestingUserId, correlationId },
      'Member removed from organization'
    )
  }
}
