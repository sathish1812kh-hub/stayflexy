import type { Folio, FolioEntry } from '../entities/Folio'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateFolioData {
  organizationId: string
  hotelId: string
  bookingId: string
  folioNumber: string
  currency?: string
  balance?: number
  createdById?: string | null
}

export interface CreateFolioEntryData {
  folioId: string
  organizationId: string
  hotelId: string
  entryType: 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT' | 'REFUND' | 'TAX' | 'FEE'
  description: string
  amount: number
  referenceId?: string | null
  referenceType?: string | null
  createdById?: string | null
}

export interface FolioFilter {
  hotelId?: string
  bookingId?: string
  status?: string
  page: number
  limit: number
}

export interface IFolioRepository {
  findById(id: string): Promise<Folio | null>
  findByBookingId(bookingId: string): Promise<Folio | null>
  findByFolioNumber(folioNumber: string): Promise<Folio | null>
  create(data: CreateFolioData): Promise<Folio>
  close(id: string, closedById: string): Promise<Folio>
  void(id: string): Promise<Folio>
  addEntry(data: CreateFolioEntryData): Promise<FolioEntry>
  listEntries(folioId: string): Promise<FolioEntry[]>
  findMany(organizationId: string, filter: FolioFilter): Promise<PaginatedResult<Folio>>
  getBalance(folioId: string): Promise<number>
}
