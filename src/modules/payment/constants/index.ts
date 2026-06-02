export const PAYMENT_ERRORS = {
  NOT_FOUND: "Payment not found",
  REFUND_NOT_FOUND: "Refund not found",
  HOTEL_NOT_FOUND: "Hotel not found or does not belong to your organization",
  BOOKING_NOT_FOUND: "Booking not found",
  ACCESS_DENIED: "You do not have access to this payment",
  OVERPAYMENT: "Payment amount would exceed the booking total",
  REFUND_EXCEEDS_PAID: "Refund amount exceeds the remaining refundable amount",
  INVALID_PAYMENT_STATUS: "Payment is not in a refundable status",
  INVALID_BOOKING_STATUS: "Booking is not in a valid status for payment",
} as const;

export const MAX_REFUND_AMOUNT_MULTIPLIER = 1;

export const PAYMENT_REFERENCE_PREFIX = "PAY";

export const REFUND_REFERENCE_PREFIX = "REF";
