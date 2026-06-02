// FILE: src/modules/invoice/types/index.ts
import type { Nullable } from "@shared-types";

// ─── Enum type aliases ────────────────────────────────────────────────────────

export type InvoiceStatusType =
  | "DRAFT"
  | "FINALIZED"
  | "PAID"
  | "VOID";

export type InvoiceItemTypeType =
  | "ROOM_CHARGE"
  | "TAX"
  | "DISCOUNT"
  | "SERVICE_CHARGE"
  | "FOOD_BEVERAGE"
  | "LAUNDRY"
  | "TRANSPORT"
  | "OTHER";

// ─── Domain interfaces ────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  organizationId: string;
  hotelId: string;
  bookingId: string;
  invoiceNumber: string;
  invoiceStatus: InvoiceStatusType;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  issuedAt: Nullable<Date>;
  dueDate: Nullable<Date>;
  notes: Nullable<string>;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemType: InvoiceItemTypeType;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  createdAt: Date;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

// ─── Input / mutation types ───────────────────────────────────────────────────

export interface CreateInvoiceItemData {
  itemType: InvoiceItemTypeType;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
}

export interface CreateInvoiceData {
  organizationId: string;
  hotelId: string;
  bookingId: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  dueDate?: Date;
  notes?: string;
  createdById: string;
}

export interface UpdateInvoiceData {
  notes?: string;
  dueDate?: Date;
}

// ─── Filter type ──────────────────────────────────────────────────────────────

export interface InvoiceFilter {
  organizationId?: string;
  hotelId?: string;
  bookingId?: string;
  status?: InvoiceStatusType;
  page?: number;
  limit?: number;
}
