import type {
  IRatePlanRepository,
  RatePlanFilter,
} from '../../domain/repositories/IRatePlanRepository'
import type { RatePlan } from '../../domain/entities/RatePlan'
import type { PaginatedResult } from '@stayflexi/shared-types'

export class ListRatePlans {
  constructor(private readonly ratePlanRepo: IRatePlanRepository) {}

  async execute(
    organizationId: string,
    filter: RatePlanFilter,
  ): Promise<PaginatedResult<RatePlan>> {
    return this.ratePlanRepo.findMany(organizationId, filter)
  }
}
