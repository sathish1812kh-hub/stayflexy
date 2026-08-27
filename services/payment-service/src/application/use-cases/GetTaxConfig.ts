import type { ITaxConfigRepository } from '../../domain/repositories/ITaxConfigRepository'
import type { TaxConfig } from '../../domain/entities/TaxConfig'
import { NotFoundError } from '@stayflexi/shared-errors'

export class GetTaxConfig {
  constructor(private readonly taxRepo: ITaxConfigRepository) {}

  async execute(id: string, organizationId: string): Promise<TaxConfig> {
    const config = await this.taxRepo.findById(id, organizationId)
    if (!config) throw new NotFoundError('Tax config not found')
    return config
  }
}
