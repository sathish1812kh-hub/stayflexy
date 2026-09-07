import { ConflictError, BadRequestError } from '@stayflexi/shared-errors'
import type { IRatePlanRepository } from '../../domain/repositories/IRatePlanRepository'
import type { RatePlan } from '../../domain/entities/RatePlan'
import type { CreateRatePlanDto } from '../dtos/ratePlan.dto'

export class CreateRatePlan {
  constructor(private readonly ratePlanRepo: IRatePlanRepository) {}

  async execute(dto: CreateRatePlanDto, organizationId: string, userId: string): Promise<RatePlan> {
    if (dto.maxStay !== null && dto.maxStay !== undefined && dto.minStay !== undefined) {
      if (dto.maxStay < dto.minStay)
        throw new BadRequestError('maxStay cannot be less than minStay')
    }
    const existing = await this.ratePlanRepo.findByCode(dto.hotelId, dto.code)
    if (existing && !existing.isDeleted) {
      throw new ConflictError(
        `RatePlan code ${dto.code} already exists for this hotel`,
        'CODE_TAKEN',
      )
    }
    return this.ratePlanRepo.create({
      organizationId,
      hotelId: dto.hotelId,
      roomTypeId: dto.roomTypeId ?? null,
      name: dto.name,
      code: dto.code,
      description: dto.description ?? null,
      seasonStart: (dto as unknown as { seasonStart: Date | null }).seasonStart ?? null,
      seasonEnd: (dto as unknown as { seasonEnd: Date | null }).seasonEnd ?? null,
      baseRate: dto.baseRate,
      currency: dto.currency ?? 'USD',
      minStay: dto.minStay ?? 1,
      maxStay: dto.maxStay ?? null,
      closedToArrival: dto.closedToArrival ?? false,
      closedToDeparture: dto.closedToDeparture ?? false,
      isActive: dto.isActive ?? true,
      createdById: userId,
    })
  }
}
