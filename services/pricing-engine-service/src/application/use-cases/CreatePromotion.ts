import { ConflictError } from '@stayflexi/shared-errors'
import type { IPromotionRepository } from '../../domain/repositories/IPromotionRepository'
import type { Promotion } from '../../domain/entities/Promotion'
import type { CreatePromotionDto } from '../dtos/promotion.dto'

export class CreatePromotion {
  constructor(private readonly promoRepo: IPromotionRepository) {}
  async execute(
    dto: CreatePromotionDto,
    organizationId: string,
    userId: string,
  ): Promise<Promotion> {
    const existing = await this.promoRepo.findByCode(dto.code)
    if (existing && !existing.deletedAt)
      throw new ConflictError(`Promotion code ${dto.code} already exists`, 'CODE_TAKEN')
    return this.promoRepo.create({
      organizationId,
      hotelId: dto.hotelId ?? null,
      code: dto.code.toUpperCase(),
      name: dto.name,
      description: dto.description ?? null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minNights: dto.minNights ?? 1,
      validFrom: (dto as unknown as { validFrom: Date }).validFrom,
      validTo: (dto as unknown as { validTo: Date }).validTo,
      maxUses: dto.maxUses ?? null,
      isActive: dto.isActive ?? true,
      createdById: userId,
    })
  }
}
