import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'
import type { Organization } from '../../domain/entities/Organization'
import type { Logger } from '@stayflexi/shared-logger'

export class TransferOwnership {
  constructor(
    private readonly orgRepo: IOrganizationRepository,
    private readonly memberRepo: IMemberRepository,
    private readonly logger: Logger
  ) {}

  async execute(
    orgId: string,
    newOwnerId: string,
    requestingUserId: string,
    correlationId?: string
  ): Promise<Organization> {
    const org = await this.orgRepo.findById(orgId)
    if (!org || org.isDeleted) {
      throw new NotFoundError('Organization not found')
    }

    if (!org.isOwnedBy(requestingUserId)) {
      throw new ForbiddenError(
        'Only the current owner can transfer ownership',
        'NOT_OWNER'
      )
    }

    if (newOwnerId === requestingUserId) {
      throw new BadRequestError('New owner must be a different user')
    }

    // New owner must already be an active member
    const newOwnerMember = await this.memberRepo.findByOrgAndUser(orgId, newOwnerId)
    if (!newOwnerMember || !newOwnerMember.isActive) {
      throw new BadRequestError(
        'The new owner must be an existing active member of the organization'
      )
    }

    const updated = await this.orgRepo.setOwner(orgId, newOwnerId)

    this.logger.info(
      { orgId, from: requestingUserId, to: newOwnerId, correlationId },
      'Organization ownership transferred'
    )

    return updated
  }
}
