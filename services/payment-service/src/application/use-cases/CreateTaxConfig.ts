import type { ITaxConfigRepository } from '../../domain/repositories/ITaxConfigRepository'
import type { TaxConfig } from '../../domain/entities/TaxConfig'
import type { Logger } from '@stayflexi/shared-logger'
import { ValidationError } from '@stayflexi/shared-errors'

export class CreateTaxConfig {
  constructor(
    private readonly taxRepo: ITaxConfigRepository,
    private readonly logger: Logger,
  ) {}

  async execute(data: {
    organizationId: string
    hotelId?: string | null
    name: string
    description?: string | null
    type?: TaxConfig['type']
    rate: number
    appliesTo?: string[]
    isActive?: boolean
  }): Promise<TaxConfig> {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Tax config name is required')
    }
    if (!data.organizationId) {
      throw new ValidationError('Organization ID is required')
    }
    if (data.rate < 0) {
      throw new ValidationError('Tax rate cannot be negative')
    }
    if (data.type === 'PERCENTAGE' && data.rate > 100) {
      throw new ValidationError('Percentage rate cannot exceed 100')
    }

    const config = await this.taxRepo.create({
      organizationId: data.organizationId,
      hotelId: data.hotelId ?? null,
      name: data.name.trim(),
      description: data.description ?? null,
      type: (data.type ?? 'PERCENTAGE') as TaxConfig['type'],
      rate: data.rate,
      appliesTo: data.appliesTo ?? ['ROOM'],
      isActive: data.isActive ?? true,
    })

    this.logger.info(
      { taxConfigId: config.id, organizationId: data.organizationId },
      'Tax config created',
    )
    return config
  }
}
