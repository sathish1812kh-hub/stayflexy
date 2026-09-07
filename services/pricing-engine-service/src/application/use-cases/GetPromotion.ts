import { NotFoundError } from '@stayflexi/shared-errors'
import type { IPromotionRepository } from '../../domain/repositories/IPromotionRepository'

export class GetPromotion {
  constructor(private readonly promoRepo: IPromotionRepository) {}
  async execute(id: string, organizationId: string) {
    const p = await this.promoRepo.findById(id)
    if (!p || p.deletedAt) throw new NotFoundError('Promotion not found')
    if (!p.belongsToOrganization(organizationId)) throw new NotFoundError('Promotion not found')
    return p
  }
}
