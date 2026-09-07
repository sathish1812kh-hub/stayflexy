import { ConflictError } from '@stayflexi/shared-errors'
import type { IFolioRepository } from '../../domain/repositories/IFolioRepository'
import type { CreateFolioDto } from '../dtos/folio.dto'

function generateFolioNumber(): string {
  return `FL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export class CreateFolio {
  constructor(private readonly folioRepo: IFolioRepository) {}
  async execute(dto: CreateFolioDto, organizationId: string, userId: string) {
    const existing = await this.folioRepo.findByBookingId(dto.bookingId)
    if (existing && existing.isOpen())
      throw new ConflictError('Open folio already exists for this booking', 'FOLIO_EXISTS')
    return this.folioRepo.create({
      organizationId,
      hotelId: dto.hotelId,
      bookingId: dto.bookingId,
      folioNumber: dto.folioNumber ?? generateFolioNumber(),
      currency: dto.currency ?? 'USD',
      balance: 0,
    })
  }
}
