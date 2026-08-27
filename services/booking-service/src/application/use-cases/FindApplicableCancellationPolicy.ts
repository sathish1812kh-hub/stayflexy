import type { ICancellationPolicyRepository } from '../../domain/repositories/ICancellationPolicyRepository'
import type { CancellationPolicy } from '../../domain/entities/CancellationPolicy'
import type { Logger } from '@stayflexi/shared-logger'
import { NotFoundError } from '@stayflexi/shared-errors'

export class FindApplicableCancellationPolicy {
  constructor(
    private readonly policyRepo: ICancellationPolicyRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    organizationId: string,
    hotelId: string,
    source: string,
    ratePlanId?: string,
  ): Promise<CancellationPolicy> {
    const policy = await this.policyRepo.findApplicable(organizationId, hotelId, source, ratePlanId)
    if (!policy) {
      throw new NotFoundError('No applicable cancellation policy found')
    }
    return policy
  }
}
