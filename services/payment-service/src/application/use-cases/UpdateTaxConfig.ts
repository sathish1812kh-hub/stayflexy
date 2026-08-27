import type { ITaxConfigRepository } from '../../domain/repositories/ITaxConfigRepository'
import type { TaxConfig } from '../../domain/entities/TaxConfig'
import { ValidationError } from '@stayflexi/shared-errors'

export class UpdateTaxConfig {
  constructor(private readonly taxRepo: ITaxConfigRepository) {}

  async execute(
    id: string,
    data: Partial<{
      name: string
      description: string | null
      type: TaxConfig['type']
      rate: number
      appliesTo: string[]
      isActive: boolean
    }>,
    organizationId: string,
  ): Promise<TaxConfig> {
    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new ValidationError('Tax config name cannot be empty')
    }
    if (data.rate !== undefined && data.rate < 0) {
      throw new ValidationError('Tax rate cannot be negative')
    }
    if (data.type === 'PERCENTAGE' && data.rate !== undefined && data.rate > 100) {
      throw new ValidationError('Percentage rate cannot exceed 100')
    }
    // If updating percentage type without rate, fetch and validate? left to repo level

    return this.taxRepo.update(id, data as any, organizationId)
  }
}
