import type { Nullable, TimestampFields } from "@shared-types";

export type PaymentStatusType =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type PaymentMethodType =
  | "CASH"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BANK_TRANSFER"
  | "UPI"
  | "WALLET"
  | "OTA_COLLECT"
  | "OTHER";

export type RefundStatusType = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export type PaymentAuditEventType =
  | "CREATED"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "REFUND_INITIATED"
  | "REFUND_SUCCESS"
  | "REFUND_FAILED"
  | "RECONCILED"
  | "VOIDED";

export interface Payment extends TimestampFields {
  id: string;
  organizationId: string;
  hotelId: string;
  bookingId: string;
  paymentReference: string;
  paymentMethod: PaymentMethodType;
  paymentProvider: Nullable<string>;
  transactionId: Nullable<string>;
  paymentStatus: PaymentStatusType;
  amount: number;
  currency: string;
  paidAt: Nullable<Date>;
  refundedAt: Nullable<Date>;
  failureReason: Nullable<string>;
  metadata: Nullable<unknown>;
  processedById: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  refundReference: string;
  refundAmount: number;
  refundReason: string;
  refundStatus: RefundStatusType;
  processedById: string;
  processedAt: Nullable<Date>;
  failureReason: Nullable<string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentAudit {
  id: string;
  paymentId: string;
  eventType: PaymentAuditEventType;
  eventDescription: string;
  performedById: string;
  metadata: Nullable<unknown>;
  createdAt: Date;
}

export interface CreatePaymentData {
  organizationId: string;
  hotelId: string;
  bookingId: string;
  paymentReference: string;
  paymentMethod: PaymentMethodType;
  paymentProvider?: string;
  transactionId?: string;
  paymentStatus: PaymentStatusType;
  amount: number;
  currency: string;
  paidAt?: Date;
  failureReason?: string;
  metadata?: unknown;
  processedById: string;
}

export interface UpdatePaymentData {
  paymentStatus?: PaymentStatusType;
  paymentProvider?: string;
  transactionId?: string;
  paidAt?: Nullable<Date>;
  refundedAt?: Nullable<Date>;
  failureReason?: Nullable<string>;
  metadata?: unknown;
}

export interface CreateRefundData {
  paymentId: string;
  refundReference: string;
  refundAmount: number;
  refundReason: string;
  refundStatus: RefundStatusType;
  processedById: string;
  processedAt?: Date;
  failureReason?: string;
}

export interface UpdateRefundData {
  refundStatus?: RefundStatusType;
  processedAt?: Nullable<Date>;
  failureReason?: Nullable<string>;
}

export interface CreatePaymentAuditData {
  paymentId: string;
  eventType: PaymentAuditEventType;
  eventDescription: string;
  performedById: string;
  metadata?: unknown;
}

export interface PaymentFilter {
  organizationId?: string;
  hotelId?: string;
  bookingId?: string;
  status?: PaymentStatusType;
  method?: PaymentMethodType;
  page?: number;
  limit?: number;
}

export interface PaymentSummary {
  id: string;
  paymentReference: string;
  amount: number;
  currency: string;
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType;
  paidAt: Nullable<Date>;
  bookingId: string;
}
