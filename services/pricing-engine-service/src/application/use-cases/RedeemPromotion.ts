import { NotFoundError, BadRequestError, ConflictError } from '@stayflexi/shared-errors'
import type { IPromotionRepository } from '../../domain/repositories/IPromotionRepository'

export interface RedeemInput {
  code: string
  organizationId: string
  hotelId?: string | null
  bookingId?: string | null
  guestId?: string | null
  baseAmount?: number
  nights?: number
  redeemedById?: string | null
}

export class RedeemPromotion {
  constructor(private readonly promoRepo: IPromotionRepository) {}

  async execute(input: RedeemInput) {
    const promo = await this.promoRepo.findByCode(input.code.toUpperCase())
    if (!promo || promo.deletedAt) throw new NotFoundError('Promotion not found')
    if (!promo.belongsToOrganization(input.organizationId))
      throw new NotFoundError('Promotion not found')
    if (!promo.canRedeem()) {
      if (promo.maxUses !== null && promo.usedCount >= promo.maxUses)
        throw new ConflictError('Promotion has reached max uses', 'MAX_USES_EXCEEDED')
      throw new BadRequestError('Promotion is not valid for redemption')
    }
    if (input.nights !== undefined && input.nights < promo.minNights) {
      throw new BadRequestError(`Promotion requires minimum ${promo.minNights} nights`)
    }
    const discountApplied =
      input.baseAmount !== undefined
        ? promo.calculateDiscount(input.baseAmount)
        : promo.discountValue
    const redemption = await this.promoRepo.redeem({
      promotionId: promo.id,
      organizationId: input.organizationId,
      hotelId: input.hotelId ?? promo.hotelId ?? null,
      bookingId: input.bookingId ?? null,
      guestId: input.guestId ?? null,
      discountApplied,
      redeemedById: input.redeemedById ?? null,
    })
    await this.promoRepo.incrementUsedCount(promo.id)
    return { promotion: promo, redemption, discountApplied }
  }
}
