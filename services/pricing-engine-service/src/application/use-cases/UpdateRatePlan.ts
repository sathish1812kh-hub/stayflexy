import { NotFoundError, BadRequestError } from '@stayflexi/shared-errors'
import type { IRatePlanRepository } from '../../domain/repositories/IRatePlanRepository'
import type { RatePlan } from '../../domain/entities/RatePlan'
import type { UpdateRatePlanDto } from '../dtos/ratePlan.dto'

export class UpdateRatePlan {
  constructor(private readonly ratePlanRepo: IRatePlanRepository) {}

  async execute(id: string, dto: UpdateRatePlanDto, organizationId: string): Promise<RatePlan> {
    const existing = await this.ratePlanRepo.findById(id)
    if (!existing || existing.isDeleted) throw new NotFoundError('RatePlan not found')
    if (!existing.belongsToOrganization(organizationId))
      throw new NotFoundError('RatePlan not found')

    if (
      (dto as unknown as { maxStay?: number | null }).maxStay !== undefined &&
      (dto as unknown as { maxStay?: number | null }).maxStay !== null
    ) {
      const maxStay = (dto as unknown as { maxStay: number }).maxStay
      const minStay = (dto as unknown as { minStay?: number }).minStay ?? existing.minStay
      if (maxStay < minStay) throw new BadRequestError('maxStay cannot be less than minStay')
    }

    const data: Record<string, unknown> = {}
    if (dto.name !== undefined) data['name'] = dto.name
    if (dto.description !== undefined) data['description'] = dto.description
    if ((dto as unknown as { seasonStart?: unknown }).seasonStart !== undefined)
      data['seasonStart'] = (dto as unknown as { seasonStart: unknown }).seasonStart
    if ((dto as unknown as { seasonEnd?: unknown }).seasonEnd !== undefined)
      data['seasonEnd'] = (dto as unknown as { seasonEnd: unknown }).seasonEnd
    if (dto.baseRate !== undefined) data['baseRate'] = dto.baseRate
    if (dto.currency !== undefined) data['currency'] = dto.currency
    if (dto.minStay !== undefined) data['minStay'] = dto.minStay
    if ((dto as unknown as { maxStay?: unknown }).maxStay !== undefined)
      data['maxStay'] = (dto as unknown as { maxStay: unknown }).maxStay
    if (dto.closedToArrival !== undefined) data['closedToArrival'] = dto.closedToArrival
    if (dto.closedToDeparture !== undefined) data['closedToDeparture'] = dto.closedToDeparture
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive

    return this.ratePlanRepo.update(id, data as Parameters<IRatePlanRepository['update']>[1])
  }
}
