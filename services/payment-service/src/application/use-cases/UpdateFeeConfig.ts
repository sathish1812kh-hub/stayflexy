import type { IFeeConfigRepository } from '../../domain/repositories/IFeeConfigRepository'
import type { FeeConfig } from '../../domain/entities/FeeConfig'
import { ValidationError } from '@stayflexi/shared-errors'

export class UpdateFeeConfig {
  constructor(private readonly feeRepo: IFeeConfigRepository) {}
  async execute(
    id: string,
    data: Partial<{
      name: string
      description: string | null
      type: FeeConfig['type']
      rate: number
      appliesTo: string[]
      isActive: boolean
    }>,
    organizationId: string,
  ): Promise<FeeConfig> {
    if (data.name !== undefined && data.name.trim().length === 0)
      throw new ValidationError('Fee config name cannot be empty')
    if (data.rate !== undefined && data.rate < 0)
      throw new ValidationError('Fee rate cannot be negative')
    if (data.type === 'PERCENTAGE' && data.rate !== undefined && data.rate > 100)
      throw new ValidationError('Percentage rate cannot exceed 100')
    return this.feeRepo.update(id, data as any, organizationId)
  }
}
