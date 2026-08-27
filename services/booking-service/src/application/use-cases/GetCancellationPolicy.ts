import type { ICancellationPolicyRepository } from '../../domain/repositories/ICancellationPolicyRepository'
import type { CancellationPolicy } from '../../domain/entities/CancellationPolicy'
import type { Logger } from '@stayflexi/shared-logger'
import { NotFoundError } from '@stayflexi/shared-errors'

export class GetCancellationPolicy {
  constructor(
    private readonly policyRepo: ICancellationPolicyRepository,
    private readonly logger: Logger,
  ) {}

  async execute(id: string, organizationId?: string | null): Promise<CancellationPolicy> {
    const policy = await this.policyRepo.findById(id, organizationId)
    if (!policy) throw new NotFoundError('Cancellation policy not found')
    return policy
  }
}
