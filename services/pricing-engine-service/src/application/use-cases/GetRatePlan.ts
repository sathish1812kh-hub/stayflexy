import { NotFoundError } from '@stayflexi/shared-errors'
import type { IRatePlanRepository } from '../../domain/repositories/IRatePlanRepository'
import type { RatePlan } from '../../domain/entities/RatePlan'

export class GetRatePlan {
  constructor(private readonly ratePlanRepo: IRatePlanRepository) {}

  async execute(id: string, organizationId: string): Promise<RatePlan> {
    const rp = await this.ratePlanRepo.findById(id)
    if (!rp || rp.isDeleted) throw new NotFoundError('RatePlan not found')
    if (!rp.belongsToOrganization(organizationId)) throw new NotFoundError('RatePlan not found')
    return rp
  }
}
