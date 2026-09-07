import { NotFoundError } from '@stayflexi/shared-errors'
import type { IRatePlanRepository } from '../../domain/repositories/IRatePlanRepository'

export class DeleteRatePlan {
  constructor(private readonly ratePlanRepo: IRatePlanRepository) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const rp = await this.ratePlanRepo.findById(id)
    if (!rp || rp.isDeleted) throw new NotFoundError('RatePlan not found')
    if (!rp.belongsToOrganization(organizationId)) throw new NotFoundError('RatePlan not found')
    await this.ratePlanRepo.softDelete(id)
  }
}
