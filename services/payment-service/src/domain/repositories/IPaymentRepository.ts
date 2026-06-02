import type { Payment, PaymentStatus, PaymentMethod } from '../entities/Payment'
import type { Refund } from '../entities/Refund'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreatePaymentData {
  organizationId: string
  hotelId: string
  bookingId: string
  paymentReference: string
  paymentMethod: PaymentMethod
  paymentProvider?: string
  transactionId?: string
  amount: number
  currency: string
  processedById: string
  metadata?: Record<string, unknown>
}

export interface CreateRefundData {
  paymentId: string
  refundReference: string
  refundAmount: number
  refundReason: string
  processedById: string
}

export interface PaymentSearchParams {
  organizationId: string
  hotelId?: string
  bookingId?: string
  paymentStatus?: PaymentStatus
  paymentMethod?: PaymentMethod
  startDate?: Date
  endDate?: Date
  page: number
  limit: number
}

export interface IPaymentRepository {
  findById(id: string): Promise<Payment | null>
  findByReference(paymentReference: string): Promise<Payment | null>
  findByOrganization(params: PaymentSearchParams): Promise<PaginatedResult<Payment>>

  // Returns sum of successful refunds for a payment
  getTotalRefunded(paymentId: string): Promise<number>

  // Get refunds for a payment
  getRefunds(paymentId: string): Promise<Refund[]>

  // Atomic: create payment + audit entry
  create(data: CreatePaymentData): Promise<Payment>

  updateStatus(id: string, status: PaymentStatus, extra?: {
    paidAt?: Date
    refundedAt?: Date
    failureReason?: string
    transactionId?: string
  }): Promise<Payment>

  createRefund(data: CreateRefundData): Promise<Refund>
  updateRefundStatus(refundId: string, status: string, processedAt?: Date, failureReason?: string): Promise<Refund>

  addAuditEntry(paymentId: string, eventType: string, description: string, performedById: string, metadata?: Record<string, unknown>): Promise<void>

  // Reconciliation: aggregate payments for a period
  aggregateByPeriod(organizationId: string, hotelId: string | undefined, startDate: Date, endDate: Date): Promise<{
    totalCollected: number
    totalRefunded: number
    netRevenue: number
    byMethod: Array<{ method: string; count: number; amount: number }>
    transactionCount: number
  }>
}
