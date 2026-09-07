import type { ISeasonRepository, SeasonFilter } from '../../domain/repositories/ISeasonRepository'

export class ListSeasons {
  constructor(private readonly seasonRepo: ISeasonRepository) {}
  async execute(organizationId: string, filter: SeasonFilter) {
    return this.seasonRepo.findMany(organizationId, filter)
  }
}
