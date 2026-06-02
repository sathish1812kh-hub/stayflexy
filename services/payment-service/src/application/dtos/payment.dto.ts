import { z } from 'zod'

const uuidSchema = z.string().uuid()
const PaymentMethodEnum = z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'UPI', 'WALLET', 'OTA_COLLECT', 'OTHER'])
const InvoiceItemTypeEnum = z.enum(['ROOM_CHARGE', 'TAX', 'DISCOUNT', 'SERVICE_CHARGE', 'FOOD_BEVERAGE', 'LAUNDRY', 'TRANSPORT', 'OTHER'])

export const initiatePaymentSchema = z.object({
  bookingId: uuidSchema,
  hotelId: uuidSchema,
  paymentMethod: PaymentMethodEnum,
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  paymentProvider: z.string().max(100).optional(),
  transactionId: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().max(255).optional(),
})
export type InitiatePaymentDto = z.infer<typeof initiatePaymentSchema>

export const confirmPaymentSchema = z.object({
  transactionId: z.string().max(255).optional(),
  providerResponse: z.record(z.unknown()).optional(),
})
export type ConfirmPaymentDto = z.infer<typeof confirmPaymentSchema>

export const processRefundSchema = z.object({
  refundAmount: z.number().positive('Refund amount must be positive'),
  refundReason: z.string().min(1).max(500),
  idempotencyKey: z.string().max(255).optional(),
})
export type ProcessRefundDto = z.infer<typeof processRefundSchema>

export const cancelPaymentSchema = z.object({
  reason: z.string().max(500).optional(),
})
export type CancelPaymentDto = z.infer<typeof cancelPaymentSchema>

export const paymentSearchSchema = z.object({
  hotelId: uuidSchema.optional(),
  bookingId: uuidSchema.optional(),
  paymentStatus: z.enum([
    'PENDING', 'PROCESSING', 'AUTHORIZED', 'CAPTURED',
    'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED',
  ]).optional(),
  paymentMethod: PaymentMethodEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().default('1').transform(Number).pipe(z.number().int().min(1)),
  limit: z.string().default('20').transform(Number).pipe(z.number().int().min(1).max(100)),
})
export type PaymentSearchDto = z.infer<typeof paymentSearchSchema>

export const invoiceItemSchema = z.object({
  itemType: InvoiceItemTypeEnum,
  itemName: z.string().min(1).max(255),
  quantity: z.number().int().min(1),
  unitPrice: z.number().positive(),
  taxRate: z.number().min(0).max(1).default(0),
})
export type InvoiceItemDto = z.infer<typeof invoiceItemSchema>

export const createInvoiceSchema = z.object({
  bookingId: uuidSchema,
  hotelId: uuidSchema,
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().optional().transform(v => v ? new Date(v) : undefined),
  items: z.array(invoiceItemSchema).min(1).max(50),
})
export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>

export const reconciliationQuerySchema = z.object({
  hotelId: uuidSchema.optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  currency: z.string().length(3).default('USD'),
})
export type ReconciliationQueryDto = z.infer<typeof reconciliationQuerySchema>
