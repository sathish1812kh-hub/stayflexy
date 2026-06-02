/**
 * Typed event contracts for all payment-service domain events.
 * These are published to the 'payment.events' Kafka topic.
 */

export const PAYMENT_EVENTS = {
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_CANCELLED: 'payment.cancelled',
} as const

export type PaymentEventType = (typeof PAYMENT_EVENTS)[keyof typeof PAYMENT_EVENTS]

export interface PaymentInitiatedPayload {
  paymentId: string
  paymentReference: string
  bookingId: string
  amount: number
  currency: string
  paymentMethod: string
}

export interface PaymentCompletedPayload {
  paymentId: string
  bookingId: string
  amount: number
  currency: string
  paymentMethod: string
  transactionId?: string
  paidAt: string
}

export interface PaymentFailedPayload {
  paymentId: string
  bookingId: string
  failureReason?: string
}

export interface PaymentRefundedPayload {
  paymentId: string
  refundId: string
  bookingId: string
  refundAmount: number
  currency: string
  refundReason: string
  newPaymentStatus: string
}

export interface PaymentCancelledPayload {
  paymentId: string
  bookingId: string
  reason?: string
}
