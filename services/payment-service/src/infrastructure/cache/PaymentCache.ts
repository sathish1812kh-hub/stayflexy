import type Redis from 'ioredis'
import { Payment } from '../../domain/entities/Payment'
import { Invoice } from '../../domain/entities/Invoice'
import type { PaymentProps } from '../../domain/entities/Payment'
import type { InvoiceProps } from '../../domain/entities/Invoice'

export class PaymentCache {
  private readonly PAYMENT_PREFIX = 'stayflexi:payment:cache'
  private readonly INVOICE_PREFIX = 'stayflexi:invoice:cache'

  constructor(
    private readonly redis: Redis,
    private readonly paymentTtl = 300,
    private readonly invoiceTtl = 600
  ) {}

  async getPayment(paymentId: string): Promise<Payment | null> {
    const raw = await this.redis.get(`${this.PAYMENT_PREFIX}:${paymentId}`)
    if (!raw) return null
    try {
      const props = JSON.parse(raw) as PaymentProps
      props.createdAt = new Date(props.createdAt)
      props.updatedAt = new Date(props.updatedAt)
      if (props.paidAt) props.paidAt = new Date(props.paidAt)
      if (props.refundedAt) props.refundedAt = new Date(props.refundedAt)
      return new Payment(props)
    } catch { return null }
  }

  async setPayment(payment: Payment): Promise<void> {
    await this.redis.setex(`${this.PAYMENT_PREFIX}:${payment.id}`, this.paymentTtl, JSON.stringify(payment.toJSON()))
  }

  async invalidatePayment(paymentId: string): Promise<void> {
    await this.redis.del(`${this.PAYMENT_PREFIX}:${paymentId}`)
  }

  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    const raw = await this.redis.get(`${this.INVOICE_PREFIX}:${invoiceId}`)
    if (!raw) return null
    try {
      const props = JSON.parse(raw) as InvoiceProps
      props.createdAt = new Date(props.createdAt)
      props.updatedAt = new Date(props.updatedAt)
      if (props.issuedAt) props.issuedAt = new Date(props.issuedAt)
      if (props.dueDate) props.dueDate = new Date(props.dueDate)
      return new Invoice(props)
    } catch { return null }
  }

  async setInvoice(invoice: Invoice): Promise<void> {
    await this.redis.setex(`${this.INVOICE_PREFIX}:${invoice.id}`, this.invoiceTtl, JSON.stringify(invoice.toJSON()))
  }

  async invalidateInvoice(invoiceId: string): Promise<void> {
    await this.redis.del(`${this.INVOICE_PREFIX}:${invoiceId}`)
  }
}
