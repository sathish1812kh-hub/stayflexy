import type { ICancellationPolicyRepository } from '../../domain/repositories/ICancellationPolicyRepository'
import type { CancellationPolicy } from '../../domain/entities/CancellationPolicy'
import type { Logger } from '@stayflexi/shared-logger'

export class ListCancellationPolicies {
  constructor(
    private readonly policyRepo: ICancellationPolicyRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    organizationId: string,
    options?: {
      hotelId?: string | null
      search?: string
      page?: number
      limit?: number
    },
  ): Promise<{ data: CancellationPolicy[]; meta: { total: number; page: number; limit: number } }> {
    return this.policyRepo.list(organizationId, options)
  }
}
