import { z } from "zod";

const PaymentStatusEnum = z.enum([
  "PENDING",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

const PaymentMethodEnum = z.enum([
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "BANK_TRANSFER",
  "UPI",
  "WALLET",
  "OTA_COLLECT",
  "OTHER",
]);

export const CreatePaymentDto = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  hotelId: z.string().uuid("Invalid hotel ID"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3, "Currency must be a 3-character ISO code").default("USD"),
  paymentMethod: PaymentMethodEnum,
  paymentProvider: z.string().optional(),
  transactionId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const InitiateRefundDto = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
  refundAmount: z.number().positive("Refund amount must be positive"),
  refundReason: z.string().min(5, "Refund reason must be at least 5 characters"),
});

export const PaymentFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  bookingId: z.string().uuid("Invalid booking ID").optional(),
  status: PaymentStatusEnum.optional(),
  method: PaymentMethodEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const dateStringSchema = z.string().refine(
  (val) => /^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(new Date(val).getTime()),
  { message: "Date must be in YYYY-MM-DD format" }
);

export const ReconciliationQueryDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
});

export type CreatePaymentDtoType = z.infer<typeof CreatePaymentDto>;
export type InitiateRefundDtoType = z.infer<typeof InitiateRefundDto>;
export type PaymentFilterDtoType = z.infer<typeof PaymentFilterDto>;
export type ReconciliationQueryDtoType = z.infer<typeof ReconciliationQueryDto>;
