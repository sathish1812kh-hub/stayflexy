import type {
  IPromotionRepository,
  PromotionFilter,
} from '../../domain/repositories/IPromotionRepository'

export class ListPromotions {
  constructor(private readonly promoRepo: IPromotionRepository) {}
  async execute(organizationId: string, filter: PromotionFilter) {
    return this.promoRepo.findMany(organizationId, filter)
  }
}
