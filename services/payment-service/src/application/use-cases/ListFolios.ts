import type { IFolioRepository, FolioFilter } from '../../domain/repositories/IFolioRepository'

export class ListFolios {
  constructor(private readonly folioRepo: IFolioRepository) {}
  async execute(organizationId: string, filter: FolioFilter) {
    return this.folioRepo.findMany(organizationId, filter)
  }
}
