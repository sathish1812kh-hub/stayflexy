import type {
  IRestrictionRepository,
  RestrictionFilter,
} from '../../domain/repositories/IRestrictionRepository'

export class ListRestrictions {
  constructor(private readonly restrictionRepo: IRestrictionRepository) {}
  async execute(organizationId: string, filter: RestrictionFilter) {
    return this.restrictionRepo.findMany(organizationId, filter)
  }
}
