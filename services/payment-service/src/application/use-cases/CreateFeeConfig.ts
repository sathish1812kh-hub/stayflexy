import type { IFeeConfigRepository } from '../../domain/repositories/IFeeConfigRepository'
import type { FeeConfig } from '../../domain/entities/FeeConfig'
import type { Logger } from '@stayflexi/shared-logger'
import { ValidationError } from '@stayflexi/shared-errors'

export class CreateFeeConfig {
  constructor(
    private readonly feeRepo: IFeeConfigRepository,
    private readonly logger: Logger,
  ) {}

  async execute(data: {
    organizationId: string
    hotelId?: string | null
    name: string
    description?: string | null
    type?: FeeConfig['type']
    rate: number
    appliesTo?: string[]
    isActive?: boolean
  }): Promise<FeeConfig> {
    if (!data.name || data.name.trim().length === 0)
      throw new ValidationError('Fee config name is required')
    if (!data.organizationId) throw new ValidationError('Organization ID is required')
    if (data.rate < 0) throw new ValidationError('Fee rate cannot be negative')
    if (data.type === 'PERCENTAGE' && data.rate > 100)
      throw new ValidationError('Percentage rate cannot exceed 100')

    const config = await this.feeRepo.create({
      organizationId: data.organizationId,
      hotelId: data.hotelId ?? null,
      name: data.name.trim(),
      description: data.description ?? null,
      type: (data.type ?? 'FIXED') as FeeConfig['type'],
      rate: data.rate,
      appliesTo: data.appliesTo ?? ['ROOM'],
      isActive: data.isActive ?? true,
    })
    this.logger.info(
      { feeConfigId: config.id, organizationId: data.organizationId },
      'Fee config created',
    )
    return config
  }
}
