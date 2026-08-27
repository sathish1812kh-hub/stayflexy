import type { ICancellationPolicyRepository } from '../../domain/repositories/ICancellationPolicyRepository'
import type { CancellationPolicy } from '../../domain/entities/CancellationPolicy'
import type { Logger } from '@stayflexi/shared-logger'
import { NotFoundError, ValidationError, ConflictError } from '@stayflexi/shared-errors'

export class CreateCancellationPolicy {
  constructor(
    private readonly policyRepo: ICancellationPolicyRepository,
    private readonly logger: Logger,
  ) {}

  async execute(data: {
    organizationId: string
    hotelId?: string | null
    name: string
    description?: string | null
    noticeHours?: number
    penaltyPercent?: number
    refundMethod?: CancellationPolicy['refundMethod']
    nonRefundableAfter?: Date | null
    isDefault?: boolean
    appliesToSources?: string[]
    appliesToRatePlans?: string[]
  }): Promise<CancellationPolicy> {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Policy name is required')
    }
    if (!data.organizationId) {
      throw new ValidationError('Organization ID is required')
    }

    const policy = await this.policyRepo.create(data)
    this.logger.info('Cancellation policy created', {
      policyId: policy.id,
      organizationId: data.organizationId,
    })
    return policy
  }
}
