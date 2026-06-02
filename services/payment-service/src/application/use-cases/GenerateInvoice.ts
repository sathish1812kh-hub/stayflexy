import { ConflictError } from '@stayflexi/shared-errors'
import type { IInvoiceRepository } from '../../domain/repositories/IInvoiceRepository'
import type { Invoice } from '../../domain/entities/Invoice'
import type { CreateInvoiceDto } from '../dtos/payment.dto'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

export class GenerateInvoice {
  constructor(
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(dto: CreateInvoiceDto, organizationId: string, userId: string, correlationId?: string): Promise<Invoice> {
    // Check if a FINALIZED or PAID invoice already exists for this booking
    const existing = await this.invoiceRepo.findByBookingId(dto.bookingId)
    const activeInvoice = existing.find(inv => inv.invoiceStatus === 'FINALIZED' || inv.invoiceStatus === 'PAID')
    if (activeInvoice) {
      throw new ConflictError(`A ${activeInvoice.invoiceStatus} invoice already exists for this booking`, 'INVOICE_EXISTS')
    }

    const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber(dto.hotelId)

    const invoice = await this.invoiceRepo.create({
      organizationId,
      hotelId: dto.hotelId,
      bookingId: dto.bookingId,
      invoiceNumber,
      currency: dto.currency,
      notes: dto.notes,
      dueDate: dto.dueDate,
      createdById: userId,
      items: dto.items.map(item => ({
        itemType: item.itemType,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      })),
    })

    this.eventPublisher.publish('payment.events', {
      eventType: 'invoice.generated',
      aggregateId: invoice.id,
      aggregateType: 'Invoice',
      organizationId,
      correlationId,
      payload: {
        invoiceId: invoice.id, invoiceNumber, bookingId: dto.bookingId,
        totalAmount: invoice.totalAmount, currency: invoice.currency,
      },
    }).catch(err => this.logger.warn({ err }, 'Failed to publish invoice.generated'))

    this.logger.info({ invoiceId: invoice.id, invoiceNumber, organizationId, correlationId }, 'Invoice generated')
    return invoice
  }
}
