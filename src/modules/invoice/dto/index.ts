// FILE: src/modules/invoice/dto/index.ts
import { z } from "zod";

// ─── Enum helpers ─────────────────────────────────────────────────────────────

const InvoiceItemTypeEnum = z.enum([
  "ROOM_CHARGE",
  "TAX",
  "DISCOUNT",
  "SERVICE_CHARGE",
  "FOOD_BEVERAGE",
  "LAUNDRY",
  "TRANSPORT",
  "OTHER",
]);

const InvoiceStatusEnum = z.enum([
  "DRAFT",
  "FINALIZED",
  "PAID",
  "VOID",
]);

// ─── CreateInvoiceDto ─────────────────────────────────────────────────────────

const invoiceItemSchema = z.object({
  itemType: InvoiceItemTypeEnum,
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  unitPrice: z.number().positive("Unit price must be a positive number"),
  taxRate: z.number().min(0).max(1, "Tax rate must be between 0 and 1").default(0),
});

export const CreateInvoiceDto = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  hotelId: z.string().uuid("Invalid hotel ID"),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one invoice item is required"),
});

// ─── UpdateInvoiceDto ─────────────────────────────────────────────────────────

export const UpdateInvoiceDto = z.object({
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

// ─── FinalizeInvoiceDto ───────────────────────────────────────────────────────

export const FinalizeInvoiceDto = z.object({}).passthrough();

// ─── InvoiceFilterDto ─────────────────────────────────────────────────────────

export const InvoiceFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  bookingId: z.string().uuid("Invalid booking ID").optional(),
  status: InvoiceStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── BillingQueryDto ──────────────────────────────────────────────────────────

export const BillingQueryDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateInvoiceDtoType = z.infer<typeof CreateInvoiceDto>;
export type UpdateInvoiceDtoType = z.infer<typeof UpdateInvoiceDto>;
export type FinalizeInvoiceDtoType = z.infer<typeof FinalizeInvoiceDto>;
export type InvoiceFilterDtoType = z.infer<typeof InvoiceFilterDto>;
export type BillingQueryDtoType = z.infer<typeof BillingQueryDto>;
