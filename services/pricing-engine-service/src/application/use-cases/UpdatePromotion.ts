import { NotFoundError } from '@stayflexi/shared-errors'
import type { IPromotionRepository } from '../../domain/repositories/IPromotionRepository'
import type { UpdatePromotionDto } from '../dtos/promotion.dto'

export class UpdatePromotion {
  constructor(private readonly promoRepo: IPromotionRepository) {}
  async execute(id: string, dto: UpdatePromotionDto, organizationId: string) {
    const existing = await this.promoRepo.findById(id)
    if (!existing || existing.deletedAt) throw new NotFoundError('Promotion not found')
    if (!existing.belongsToOrganization(organizationId))
      throw new NotFoundError('Promotion not found')
    const data: Record<string, unknown> = {}
    if (dto.name !== undefined) data['name'] = dto.name
    if (dto.description !== undefined) data['description'] = dto.description
    if (dto.discountType !== undefined) data['discountType'] = dto.discountType
    if (dto.discountValue !== undefined) data['discountValue'] = dto.discountValue
    if (dto.minNights !== undefined) data['minNights'] = dto.minNights
    if ((dto as unknown as { validFrom?: unknown }).validFrom !== undefined)
      data['validFrom'] = (dto as unknown as { validFrom: unknown }).validFrom
    if ((dto as unknown as { validTo?: unknown }).validTo !== undefined)
      data['validTo'] = (dto as unknown as { validTo: unknown }).validTo
    if (dto.maxUses !== undefined) data['maxUses'] = dto.maxUses
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive
    return this.promoRepo.update(id, data as Parameters<IPromotionRepository['update']>[1])
  }
}
