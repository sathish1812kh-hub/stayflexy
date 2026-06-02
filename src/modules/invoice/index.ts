// FILE: src/modules/invoice/index.ts

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Invoice,
  InvoiceItem,
  InvoiceWithItems,
  InvoiceStatusType,
  InvoiceItemTypeType,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateInvoiceItemData,
  InvoiceFilter,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
export { INVOICE_ERRORS, INVOICE_NUMBER_PREFIX, DEFAULT_TAX_RATE } from "./constants";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  FinalizeInvoiceDto,
  InvoiceFilterDto,
  BillingQueryDto,
} from "./dto";
export type {
  CreateInvoiceDtoType,
  UpdateInvoiceDtoType,
  FinalizeInvoiceDtoType,
  InvoiceFilterDtoType,
  BillingQueryDtoType,
} from "./dto";

// ─── Validators ───────────────────────────────────────────────────────────────
export {
  validateCreateInvoice,
  validateUpdateInvoice,
  validateFinalizeInvoice,
  validateInvoiceFilter,
  validateBillingQuery,
} from "./validators";

// ─── Repositories ─────────────────────────────────────────────────────────────
export { PrismaInvoiceRepository } from "./repositories";

// ─── Services ─────────────────────────────────────────────────────────────────
export { InvoiceService } from "./services/InvoiceService";
export { BillingService } from "./services/BillingService";
export type { BillingSummary } from "./services/BillingService";

// ─── Container ────────────────────────────────────────────────────────────────
export { invoiceService, billingService } from "./container";
