// FILE: src/modules/invoice/constants/index.ts

export const INVOICE_ERRORS = {
  INVOICE_NOT_FOUND: "Invoice not found",
  INVOICE_NOT_DRAFT: "Invoice is not in DRAFT status",
  INVOICE_ALREADY_FINALIZED: "Invoice has already been finalized",
  INVOICE_ALREADY_VOID: "Invoice has already been voided",
  INVOICE_NUMBER_EXISTS: "An invoice with this number already exists for this hotel",
} as const;

export const INVOICE_NUMBER_PREFIX = "INV";
export const DEFAULT_TAX_RATE = 0.10;
