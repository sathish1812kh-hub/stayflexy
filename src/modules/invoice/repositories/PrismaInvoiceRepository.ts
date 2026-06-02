// FILE: src/modules/invoice/repositories/PrismaInvoiceRepository.ts
import { type Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  Invoice,
  InvoiceItem,
  InvoiceWithItems,
  CreateInvoiceData,
  UpdateInvoiceData,
  CreateInvoiceItemData,
  InvoiceFilter,
  InvoiceStatusType,
  InvoiceItemTypeType,
} from "../types";

type PaginationMeta = PaginatedResult<Invoice>["meta"];

type PrismaInvoiceRecord = Prisma.InvoiceGetPayload<Record<string, never>>;
type PrismaInvoiceItemRecord = Prisma.InvoiceItemGetPayload<Record<string, never>>;
type PrismaInvoiceWithItems = Prisma.InvoiceGetPayload<{
  include: { items: true };
}>;

function toInvoice(r: PrismaInvoiceRecord): Invoice {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    bookingId: r.bookingId,
    invoiceNumber: r.invoiceNumber,
    invoiceStatus: r.invoiceStatus as InvoiceStatusType,
    subtotal: r.subtotal.toNumber(),
    taxAmount: r.taxAmount.toNumber(),
    discountAmount: r.discountAmount.toNumber(),
    totalAmount: r.totalAmount.toNumber(),
    currency: r.currency,
    issuedAt: r.issuedAt ?? null,
    dueDate: r.dueDate ?? null,
    notes: r.notes ?? null,
    createdById: r.createdById,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toInvoiceItem(r: PrismaInvoiceItemRecord): InvoiceItem {
  return {
    id: r.id,
    invoiceId: r.invoiceId,
    itemType: r.itemType as InvoiceItemTypeType,
    itemName: r.itemName,
    quantity: r.quantity,
    unitPrice: r.unitPrice.toNumber(),
    totalPrice: r.totalPrice.toNumber(),
    taxRate: r.taxRate.toNumber(),
    createdAt: r.createdAt,
  };
}

function toInvoiceWithItems(r: PrismaInvoiceWithItems): InvoiceWithItems {
  return {
    ...toInvoice(r),
    items: r.items.map(toInvoiceItem),
  };
}

export class PrismaInvoiceRepository extends BaseRepository<
  Invoice,
  CreateInvoiceData,
  UpdateInvoiceData
> {
  async findById(id: string): Promise<Nullable<InvoiceWithItems>> {
    const r = await this.db.invoice.findFirst({
      where: { id },
      include: { items: true },
    });
    return r ? toInvoiceWithItems(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<Invoice>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.invoice.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.invoice.count(),
    ]);
    return { data: records.map(toInvoice), meta: this.buildPaginationMeta(total, params) };
  }

  async findByBooking(bookingId: string): Promise<InvoiceWithItems[]> {
    const records = await this.db.invoice.findMany({
      where: { bookingId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toInvoiceWithItems);
  }

  async findManyFiltered(
    filter: InvoiceFilter
  ): Promise<{ data: InvoiceWithItems[]; meta: PaginationMeta }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.InvoiceWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.hotelId && { hotelId: filter.hotelId }),
      ...(filter.bookingId && { bookingId: filter.bookingId }),
      ...(filter.status && {
        invoiceStatus: filter.status as PrismaInvoiceRecord["invoiceStatus"],
      }),
    };

    const [records, total] = await Promise.all([
      this.db.invoice.findMany({
        where,
        include: { items: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.invoice.count({ where }),
    ]);

    return {
      data: records.map(toInvoiceWithItems),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async create(data: CreateInvoiceData): Promise<Invoice> {
    const r = await this.db.invoice.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        bookingId: data.bookingId,
        invoiceNumber: data.invoiceNumber,
        invoiceStatus: "DRAFT",
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        discountAmount: data.discountAmount,
        totalAmount: data.totalAmount,
        currency: data.currency,
        dueDate: data.dueDate ?? null,
        notes: data.notes ?? null,
        createdById: data.createdById,
      },
    });
    return toInvoice(r);
  }

  async createWithItems(
    data: CreateInvoiceData,
    items: CreateInvoiceItemData[]
  ): Promise<InvoiceWithItems> {
    const result = await this.withTransaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          organizationId: data.organizationId,
          hotelId: data.hotelId,
          bookingId: data.bookingId,
          invoiceNumber: data.invoiceNumber,
          invoiceStatus: "DRAFT",
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          discountAmount: data.discountAmount,
          totalAmount: data.totalAmount,
          currency: data.currency,
          dueDate: data.dueDate ?? null,
          notes: data.notes ?? null,
          createdById: data.createdById,
        },
      });

      await tx.invoiceItem.createMany({
        data: items.map((item) => ({
          invoiceId: invoice.id,
          itemType: item.itemType as PrismaInvoiceItemRecord["itemType"],
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxRate: item.taxRate,
        })),
      });

      const invoiceWithItems = await tx.invoice.findFirstOrThrow({
        where: { id: invoice.id },
        include: { items: true },
      });

      return invoiceWithItems;
    });

    return toInvoiceWithItems(result);
  }

  async update(id: string, data: UpdateInvoiceData): Promise<Invoice> {
    const payload: Prisma.InvoiceUpdateInput = {};
    if (data.notes !== undefined) payload.notes = data.notes;
    if (data.dueDate !== undefined) payload.dueDate = data.dueDate;

    const r = await this.db.invoice.update({ where: { id }, data: payload });
    return toInvoice(r);
  }

  async updateStatus(
    id: string,
    status: InvoiceStatusType,
    extra?: { issuedAt?: Date }
  ): Promise<Invoice> {
    const payload: Prisma.InvoiceUpdateInput = {
      invoiceStatus: status as PrismaInvoiceRecord["invoiceStatus"],
    };
    if (extra?.issuedAt !== undefined) payload.issuedAt = extra.issuedAt;

    const r = await this.db.invoice.update({ where: { id }, data: payload });
    return toInvoice(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.invoice.delete({ where: { id } });
  }

  async generateInvoiceNumber(hotelId: string): Promise<string> {
    const count = await this.db.invoice.count({ where: { hotelId } });
    const prefix = hotelId.slice(0, 8).toUpperCase();
    const seq = (count + 1).toString().padStart(6, "0");
    return `INV-${prefix}-${seq}`;
  }
}
