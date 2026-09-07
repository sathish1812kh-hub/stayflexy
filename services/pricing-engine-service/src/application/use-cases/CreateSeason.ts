import { ConflictError } from '@stayflexi/shared-errors'
import type { ISeasonRepository } from '../../domain/repositories/ISeasonRepository'
import type { CreateSeasonDto } from '../dtos/ratePlan.dto'

export class CreateSeason {
  constructor(private readonly seasonRepo: ISeasonRepository) {}

  async execute(dto: CreateSeasonDto, organizationId: string) {
    const existing = await this.seasonRepo.findByCode(dto.hotelId, dto.code)
    if (existing && !existing.deletedAt)
      throw new ConflictError(`Season code ${dto.code} already exists`, 'CODE_TAKEN')
    return this.seasonRepo.create({
      organizationId,
      hotelId: dto.hotelId,
      name: dto.name,
      code: dto.code,
      description: dto.description ?? null,
      startDate: (dto as unknown as { startDate: Date }).startDate,
      endDate: (dto as unknown as { endDate: Date }).endDate,
      isActive: dto.isActive ?? true,
    })
  }
}
