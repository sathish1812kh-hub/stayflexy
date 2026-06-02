import { z } from 'zod'
import { createEnvelopeSchema } from './EventEnvelopeSchema'

export const PaymentInitiatedPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  paymentReference: z.string().min(1),
  bookingId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3),
  paymentMethod: z.string().min(1),
})

export const PaymentConfirmedPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  bookingId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1),
  confirmedAt: z.string().min(1),
})

export const PaymentFailedPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  bookingId: z.string().min(1),
  failureReason: z.string().min(1),
})

export const PaymentRefundedPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  refundId: z.string().min(1),
  refundAmount: z.number().positive(),
  currency: z.string().min(1),
})

export type PaymentInitiatedPayload = z.infer<typeof PaymentInitiatedPayloadSchema>
export type PaymentConfirmedPayload = z.infer<typeof PaymentConfirmedPayloadSchema>
export type PaymentFailedPayload = z.infer<typeof PaymentFailedPayloadSchema>
export type PaymentRefundedPayload = z.infer<typeof PaymentRefundedPayloadSchema>

export const PaymentInitiatedEnvelopeSchema = createEnvelopeSchema(PaymentInitiatedPayloadSchema)
export const PaymentConfirmedEnvelopeSchema = createEnvelopeSchema(PaymentConfirmedPayloadSchema)
export const PaymentFailedEnvelopeSchema = createEnvelopeSchema(PaymentFailedPayloadSchema)
export const PaymentRefundedEnvelopeSchema = createEnvelopeSchema(PaymentRefundedPayloadSchema)
