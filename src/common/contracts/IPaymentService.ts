import type { Nullable } from "@shared-types";

export interface PaymentResult {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  gatewayTransactionId: Nullable<string>;
  paidAt: Nullable<Date>;
}

export interface RefundResult {
  id: string;
  paymentId: string;
  amount: number;
  status: string;
  processedAt: Nullable<Date>;
}

export interface IPaymentService {
  findById(id: string): Promise<Nullable<PaymentResult>>;
  getByBooking(bookingId: string): Promise<PaymentResult[]>;
  getTotalPaidForBooking(bookingId: string): Promise<number>;
  isFullyPaid(bookingId: string, expectedAmount: number): Promise<boolean>;
}
