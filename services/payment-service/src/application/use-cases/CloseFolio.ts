import { NotFoundError, BadRequestError } from '@stayflexi/shared-errors'
import type { IFolioRepository } from '../../domain/repositories/IFolioRepository'

export class CloseFolio {
  constructor(private readonly folioRepo: IFolioRepository) {}
  async execute(folioId: string, organizationId: string, userId: string) {
    const folio = await this.folioRepo.findById(folioId)
    if (!folio) throw new NotFoundError('Folio not found')
    if (!folio.belongsToOrganization(organizationId)) throw new NotFoundError('Folio not found')
    if (!folio.isOpen()) throw new BadRequestError('Folio is already closed')
    return this.folioRepo.close(folioId, userId)
  }
}
