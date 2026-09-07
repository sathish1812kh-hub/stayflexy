import { NotFoundError, BadRequestError } from '@stayflexi/shared-errors'
import type { IFolioRepository } from '../../domain/repositories/IFolioRepository'
import type { AddFolioEntryDto } from '../dtos/folio.dto'

export class AddFolioEntry {
  constructor(private readonly folioRepo: IFolioRepository) {}
  async execute(folioId: string, dto: AddFolioEntryDto, organizationId: string, userId: string) {
    const folio = await this.folioRepo.findById(folioId)
    if (!folio) throw new NotFoundError('Folio not found')
    if (!folio.belongsToOrganization(organizationId)) throw new NotFoundError('Folio not found')
    if (!folio.isOpen()) throw new BadRequestError('Cannot add entry to closed folio')
    return this.folioRepo.addEntry({
      folioId,
      organizationId,
      hotelId: folio.hotelId,
      entryType: dto.entryType,
      description: dto.description,
      amount: dto.amount,
      referenceId: dto.referenceId ?? null,
      referenceType: dto.referenceType ?? null,
      createdById: userId,
    })
  }
}
