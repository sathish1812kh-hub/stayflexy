import type { Invoice, InvoiceStatus, InvoiceItemType } from '../entities/Invoice'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateInvoiceItemData {
  itemType: InvoiceItemType
  itemName: string
  quantity: number
  unitPrice: number
  taxRate: number
}

export interface CreateInvoiceData {
  organizationId: string
  hotelId: string
  bookingId: string
  invoiceNumber: string
  currency: string
  notes?: string
  dueDate?: Date
  createdById: string
  items: CreateInvoiceItemData[]
}

export interface IInvoiceRepository {
  findById(id: string): Promise<Invoice | null>
  findByBookingId(bookingId: string): Promise<Invoice[]>
  findByOrganization(organizationId: string, page: number, limit: number, status?: InvoiceStatus): Promise<PaginatedResult<Invoice>>
  generateInvoiceNumber(hotelId: string): Promise<string>
  create(data: CreateInvoiceData): Promise<Invoice>
  updateStatus(id: string, status: InvoiceStatus, issuedAt?: Date): Promise<Invoice>
}
