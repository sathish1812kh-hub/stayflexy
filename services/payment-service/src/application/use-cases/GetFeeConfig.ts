import type { IFeeConfigRepository } from '../../domain/repositories/IFeeConfigRepository'
import type { FeeConfig } from '../../domain/entities/FeeConfig'
import { NotFoundError } from '@stayflexi/shared-errors'

export class GetFeeConfig {
  constructor(private readonly feeRepo: IFeeConfigRepository) {}
  async execute(id: string, organizationId: string): Promise<FeeConfig> {
    const config = await this.feeRepo.findById(id, organizationId)
    if (!config) throw new NotFoundError('Fee config not found')
    return config
  }
}
