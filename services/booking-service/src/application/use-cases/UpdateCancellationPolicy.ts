import type { ICancellationPolicyRepository } from '../../domain/repositories/ICancellationPolicyRepository'
import type { CancellationPolicy } from '../../domain/entities/CancellationPolicy'
import type { Logger } from '@stayflexi/shared-logger'
import { NotFoundError, ValidationError, ConflictError } from '@stayflexi/shared-errors'

export class UpdateCancellationPolicy {
  constructor(
    private readonly policyRepo: ICancellationPolicyRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    id: string,
    data: Partial<{
      name: string
      description: string | null
      noticeHours: number
      penaltyPercent: number
      refundMethod: CancellationPolicy['refundMethod']
      nonRefundableAfter: Date | null
      isDefault: boolean
      appliesToSources: string[]
      appliesToRatePlans: string[]
    }>,
    organizationId?: string | null,
  ): Promise<CancellationPolicy> {
    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new ValidationError('Policy name cannot be empty')
    }
    if (
      data.penaltyPercent !== undefined &&
      (data.penaltyPercent < 0 || data.penaltyPercent > 100)
    ) {
      throw new ValidationError('Penalty percent must be between 0 and 100')
    }
    if (data.noticeHours !== undefined && data.noticeHours < 0) {
      throw new ValidationError('Notice hours cannot be negative')
    }

    const policy = await this.policyRepo.update(id, data, organizationId)
    this.logger.info('Cancellation policy updated', { policyId: id })
    return policy
  }
}
