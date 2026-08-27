import type { ICancellationPolicyRepository } from '../../domain/repositories/ICancellationPolicyRepository'
import type { Logger } from '@stayflexi/shared-logger'
import { NotFoundError } from '@stayflexi/shared-errors'

export class DeleteCancellationPolicy {
  constructor(
    private readonly policyRepo: ICancellationPolicyRepository,
    private readonly logger: Logger,
  ) {}

  async execute(id: string, organizationId?: string | null): Promise<void> {
    await this.policyRepo.delete(id, organizationId)
    this.logger.info('Cancellation policy deleted (soft)', { policyId: id })
  }
}
