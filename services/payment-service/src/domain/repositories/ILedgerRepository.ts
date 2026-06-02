import type { LedgerEntry, LedgerEntryType, LedgerCategory } from '../entities/LedgerEntry'

export interface CreateLedgerEntryData {
  organizationId: string
  hotelId: string
  referenceId: string
  referenceType: string
  entryType: LedgerEntryType
  category: LedgerCategory
  amount: number
  currency: string
  description: string
  correlationId?: string
}

export interface LedgerBalance {
  totalCredits: number
  totalDebits: number
  netBalance: number
}

export interface ILedgerRepository {
  create(data: CreateLedgerEntryData): Promise<LedgerEntry>
  findByReference(referenceId: string): Promise<LedgerEntry[]>
  getBalance(organizationId: string, hotelId: string, currency: string): Promise<LedgerBalance>
}
