import SchemaBuilder from '@pothos/core'
import FederationPlugin from '@pothos/plugin-federation'
import type { InitiatePayment } from '../../application/use-cases/InitiatePayment'
import type { ConfirmPayment } from '../../application/use-cases/ConfirmPayment'
import type { ProcessRefund } from '../../application/use-cases/ProcessRefund'
import type { GenerateInvoice } from '../../application/use-cases/GenerateInvoice'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { IInvoiceRepository } from '../../domain/repositories/IInvoiceRepository'

export interface GraphQLContext {
  userId: string | null
  organizationId: string | null
  role: string
  correlationId?: string
  
  // Use cases & Repositories
  initiatePayment: InitiatePayment
  confirmPayment: ConfirmPayment
  processRefund: ProcessRefund
  generateInvoice: GenerateInvoice
  paymentRepo: IPaymentRepository
  invoiceRepo: IInvoiceRepository
}

export const builder = new SchemaBuilder<{
  Context: GraphQLContext
  Scalars: {
    DateTime: { Input: Date; Output: Date }
  }
}>({
  plugins: [FederationPlugin],
})

builder.scalarType('DateTime', {
  serialize: (value) => (value instanceof Date ? value.toISOString() : value),
  parseValue: (value) => new Date(value as string),
})

builder.queryType({})
builder.mutationType({})
