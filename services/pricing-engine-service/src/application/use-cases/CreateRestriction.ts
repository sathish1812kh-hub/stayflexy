import type { IRestrictionRepository } from '../../domain/repositories/IRestrictionRepository'
import type { CreateRestrictionDto } from '../dtos/ratePlan.dto'

export class CreateRestriction {
  constructor(private readonly restrictionRepo: IRestrictionRepository) {}
  async execute(dto: CreateRestrictionDto, organizationId: string) {
    return this.restrictionRepo.create({
      organizationId,
      hotelId: dto.hotelId,
      ratePlanId: dto.ratePlanId ?? null,
      roomTypeId: dto.roomTypeId ?? null,
      restrictionDate: (dto as unknown as { restrictionDate: Date }).restrictionDate,
      minStay: dto.minStay ?? null,
      maxStay: dto.maxStay ?? null,
      closedToArrival: dto.closedToArrival ?? false,
      closedToDeparture: dto.closedToDeparture ?? false,
      isActive: dto.isActive ?? true,
    })
  }
}
