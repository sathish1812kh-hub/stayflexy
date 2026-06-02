import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '@stayflexi/shared-errors'
import type { IEventPublisher } from '@stayflexi/shared-events'
import { ORG_EVENTS } from '@stayflexi/shared-events'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'
import type { AddMemberDto } from '../dtos/organization.dto'
import type { Member } from '../../domain/entities/Member'
import type { Logger } from '@stayflexi/shared-logger'

export class AddMember {
  constructor(
    private readonly orgRepo: IOrganizationRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
    private readonly maxMembersPerOrg: number = 500
  ) {}

  async execute(
    orgId: string,
    dto: AddMemberDto,
    requestingUserId: string,
    correlationId?: string
  ): Promise<Member> {
    const org = await this.orgRepo.findById(orgId)
    if (!org || org.isDeleted) {
      throw new NotFoundError('Organization not found')
    }

    // Only owner can add members
    if (!org.isOwnedBy(requestingUserId)) {
      throw new ForbiddenError(
        'Only the organization owner can add members',
        'NOT_OWNER'
      )
    }

    // Enforce member limit
    const currentCount = await this.memberRepo.countActiveByOrg(orgId)
    if (currentCount >= this.maxMembersPerOrg) {
      throw new BadRequestError(
        `Organization has reached the maximum member limit of ${this.maxMembersPerOrg}`
      )
    }

    // Prevent duplicate membership
    const existing = await this.memberRepo.findByOrgAndUser(orgId, dto.userId)
    if (existing && existing.isActive) {
      throw new ConflictError(
        'User is already a member of this organization',
        'ALREADY_MEMBER'
      )
    }

    const member = await this.memberRepo.create({
      organizationId: orgId,
      userId: dto.userId,
      isOwner: false,
    })

    this.eventPublisher
      .publish('organization.events', {
        eventType: ORG_EVENTS.MEMBER_ADDED,
        aggregateId: orgId,
        aggregateType: 'Organization',
        organizationId: orgId,
        correlationId,
        payload: {
          organizationId: orgId,
          userId: dto.userId,
          addedBy: requestingUserId,
        },
      })
      .catch((err: unknown) => {
        this.logger.warn({ err }, 'Failed to publish member.added event')
      })

    this.logger.info(
      { orgId, userId: dto.userId, correlationId },
      'Member added to organization'
    )
    return member
  }
}
