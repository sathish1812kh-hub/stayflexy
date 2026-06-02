import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient } from '@prisma/client'
import { Invoice } from '../../domain/entities/Invoice'
import type { InvoiceProps, InvoiceStatus, InvoiceItemType, InvoiceItemProps } from '../../domain/entities/Invoice'
import type { IInvoiceRepository, CreateInvoiceData } from '../../domain/repositories/IInvoiceRepository'
import type { PaginatedResult } from '@stayflexi/shared-types'

type PrismaInvoice = Prisma.InvoiceGetPayload<{ include: { items: true } }>

function mapToInvoice(r: PrismaInvoice): Invoice {
  return new Invoice({
    id: r.id, organizationId: r.organizationId, hotelId: r.hotelId, bookingId: r.bookingId,
    invoiceNumber: r.invoiceNumber, invoiceStatus: r.invoiceStatus as InvoiceStatus,
    subtotal: r.subtotal.toNumber(), taxAmount: r.taxAmount.toNumber(),
    discountAmount: r.discountAmount.toNumber(), totalAmount: r.totalAmount.toNumber(),
    currency: r.currency, issuedAt: r.issuedAt, dueDate: r.dueDate, notes: r.notes,
    createdById: r.createdById, createdAt: r.createdAt, updatedAt: r.updatedAt,
    items: r.items.map(item => ({
      id: item.id, invoiceId: item.invoiceId,
      itemType: item.itemType as InvoiceItemType,
      itemName: item.itemName, quantity: item.quantity,
      unitPrice: item.unitPrice.toNumber(),
      totalPrice: item.totalPrice.toNumber(),
      taxRate: item.taxRate.toNumber(),
    } satisfies InvoiceItemProps)),
  })
}

export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findById(id: string): Promise<Invoice | null> {
    try {
      const r = await this.db.invoice.findUnique({ where: { id }, include: { items: true } })
      return r ? mapToInvoice(r) : null
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async findByBookingId(bookingId: string): Promise<Invoice[]> {
    const records = await this.db.invoice.findMany({ where: { bookingId }, include: { items: true }, orderBy: { createdAt: 'desc' } })
    return records.map(mapToInvoice)
  }

  async findByOrganization(organizationId: string, page: number, limit: number, status?: InvoiceStatus): Promise<PaginatedResult<Invoice>> {
    const skip = (page - 1) * limit
    const where: Prisma.InvoiceWhereInput = {
      organizationId,
      ...(status && { invoiceStatus: status as Prisma.InvoiceGetPayload<Record<string, never>>['invoiceStatus'] }),
    }
    const [records, total] = await Promise.all([
      this.db.invoice.findMany({ where, include: { items: true }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.db.invoice.count({ where }),
    ])
    return { data: records.map(mapToInvoice), meta: buildPaginationMeta(total, page, limit) }
  }

  async generateInvoiceNumber(hotelId: string): Promise<string> {
    const count = await this.db.invoice.count({ where: { hotelId } })
    const sequence = String(count + 1).padStart(6, '0')
    return `INV-${hotelId.slice(0, 8).toUpperCase()}-${sequence}`
  }

  async create(data: CreateInvoiceData): Promise<Invoice> {
    try {
      // Compute amounts
      let subtotal = 0
      let taxAmount = 0
      const itemsWithAmounts = data.items.map(item => {
        const total = item.quantity * item.unitPrice
        const tax = total * item.taxRate
        subtotal += total
        taxAmount += tax
        return { ...item, totalPrice: total }
      })
      const totalAmount = subtotal + taxAmount

      const r = await this.db.$transaction(async (tx) => {
        const invoice = await tx.invoice.create({
          data: {
            organizationId: data.organizationId, hotelId: data.hotelId, bookingId: data.bookingId,
            invoiceNumber: data.invoiceNumber, invoiceStatus: 'DRAFT',
            subtotal: new Prisma.Decimal(subtotal), taxAmount: new Prisma.Decimal(taxAmount),
            discountAmount: new Prisma.Decimal(0), totalAmount: new Prisma.Decimal(totalAmount),
            currency: data.currency, notes: data.notes ?? null, dueDate: data.dueDate ?? null,
            createdById: data.createdById,
          },
        })
        await tx.invoiceItem.createMany({
          data: itemsWithAmounts.map(item => ({
            invoiceId: invoice.id,
            itemType: item.itemType as Prisma.InvoiceGetPayload<Record<string, never>>['invoiceStatus'],
            itemName: item.itemName, quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalPrice: new Prisma.Decimal(item.totalPrice),
            taxRate: new Prisma.Decimal(item.taxRate),
          })),
        })
        return tx.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { items: true } })
      })
      return mapToInvoice(r)
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async updateStatus(id: string, status: InvoiceStatus, issuedAt?: Date): Promise<Invoice> {
    const r = await this.db.invoice.update({
      where: { id },
      data: {
        invoiceStatus: status as Prisma.InvoiceGetPayload<Record<string, never>>['invoiceStatus'],
        ...(issuedAt && { issuedAt }),
      },
      include: { items: true },
    })
    return mapToInvoice(r)
  }
}
