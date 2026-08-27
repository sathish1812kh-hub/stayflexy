import type { ITaxConfigRepository } from '../../domain/repositories/ITaxConfigRepository'
import type { TaxConfig } from '../../domain/entities/TaxConfig'
import type { PaginatedResult } from '@stayflexi/shared-types'

export class ListTaxConfigs {
  constructor(private readonly taxRepo: ITaxConfigRepository) {}

  async execute(
    organizationId: string,
    query: {
      hotelId?: string | null
      isActive?: boolean
      search?: string
      page?: number
      limit?: number
    },
  ): Promise<PaginatedResult<TaxConfig>> {
    return this.taxRepo.list({
      organizationId,
      hotelId: query.hotelId ?? undefined,
      isActive: query.isActive,
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    })
  }
}
