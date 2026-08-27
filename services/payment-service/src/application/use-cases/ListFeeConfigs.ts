import type { IFeeConfigRepository } from '../../domain/repositories/IFeeConfigRepository'
import type { FeeConfig } from '../../domain/entities/FeeConfig'
import type { PaginatedResult } from '@stayflexi/shared-types'

export class ListFeeConfigs {
  constructor(private readonly feeRepo: IFeeConfigRepository) {}
  async execute(
    organizationId: string,
    query: {
      hotelId?: string | null
      isActive?: boolean
      search?: string
      page?: number
      limit?: number
    },
  ): Promise<PaginatedResult<FeeConfig>> {
    return this.feeRepo.list({
      organizationId,
      hotelId: query.hotelId ?? undefined,
      isActive: query.isActive,
      search: query.search,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    })
  }
}
