// FILE: src/modules/invoice/services/InvoiceService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { NotFoundError, ConflictError, ForbiddenError } from "@errors/HttpError";
import type { PrismaInvoiceRepository } from "../repositories/PrismaInvoiceRepository";
import type {
  Invoice,
  InvoiceWithItems,
  InvoiceFilter,
} from "../types";
import type { CreateInvoiceDtoType, UpdateInvoiceDtoType, InvoiceFilterDtoType } from "../dto";
import { INVOICE_ERRORS } from "../constants";
import type { PaginatedResult } from "@shared-types";

export class InvoiceService extends BaseService {
  protected readonly moduleName = "InvoiceService";

  constructor(private readonly invoiceRepo: PrismaInvoiceRepository) {
    super();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async validateHotelAccess(hotelId: string, orgId: string): Promise<void> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!hotel) throw new ForbiddenError("Hotel not found or access denied");
  }

  private async validateInvoiceOrgAccess(
    id: string,
    orgId: string
  ): Promise<InvoiceWithItems> {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new NotFoundError(INVOICE_ERRORS.INVOICE_NOT_FOUND);
    if (invoice.organizationId !== orgId) {
      throw new ForbiddenError("You do not have access to this invoice");
    }
    return invoice;
  }

  // ─── createInvoice ────────────────────────────────────────────────────────────

  async createInvoice(
    dto: CreateInvoiceDtoType,
    userId: string,
    orgId: string
  ): Promise<InvoiceWithItems> {
    return this.execute("createInvoice", async () => {
      // 1. Validate hotel belongs to org
      await this.validateHotelAccess(dto.hotelId, orgId);

      // 2. Validate booking status
      const booking = await prisma.booking.findFirst({
        where: { id: dto.bookingId, hotelId: dto.hotelId },
        select: { id: true, status: true, currency: true, organizationId: true },
      });
      if (!booking) throw new NotFoundError("Booking not found");
      if (booking.organizationId !== orgId) {
        throw new ForbiddenError("You do not have access to this booking");
      }
      const validStatuses = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] as const;
      if (!validStatuses.includes(booking.status as (typeof validStatuses)[number])) {
        throw new ConflictError(
          "Booking must be CONFIRMED, CHECKED_IN, or CHECKED_OUT to create an invoice"
        );
      }

      // 3. Calculate amounts
      let subtotal = 0;
      let taxAmount = 0;
      const itemsData = dto.items.map((item) => {
        const totalPrice =
          Math.round(item.quantity * item.unitPrice * 100) / 100;
        const itemTax = Math.round(totalPrice * (item.taxRate ?? 0) * 100) / 100;
        subtotal += totalPrice;
        taxAmount += itemTax;
        return {
          itemType: item.itemType,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          taxRate: item.taxRate ?? 0,
        };
      });

      subtotal = Math.round(subtotal * 100) / 100;
      taxAmount = Math.round(taxAmount * 100) / 100;
      const discountAmount = 0;
      const totalAmount =
        Math.round((subtotal + taxAmount - discountAmount) * 100) / 100;

      // 4. Generate invoice number
      const invoiceNumber = await this.invoiceRepo.generateInvoiceNumber(dto.hotelId);

      // 5. Create invoice with items
      const invoice = await this.invoiceRepo.createWithItems(
        {
          organizationId: orgId,
          hotelId: dto.hotelId,
          bookingId: dto.bookingId,
          invoiceNumber,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          currency: booking.currency,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          notes: dto.notes,
          createdById: userId,
        },
        itemsData
      );

      return invoice;
    });
  }

  // ─── updateInvoice ────────────────────────────────────────────────────────────

  async updateInvoice(
    id: string,
    dto: UpdateInvoiceDtoType,
    orgId: string
  ): Promise<InvoiceWithItems> {
    return this.execute("updateInvoice", async () => {
      const invoice = await this.validateInvoiceOrgAccess(id, orgId);

      // Must be DRAFT status
      if (invoice.invoiceStatus !== "DRAFT") {
        throw new ConflictError(INVOICE_ERRORS.INVOICE_NOT_DRAFT);
      }

      await this.invoiceRepo.update(id, {
        notes: dto.notes,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      });

      // Re-fetch with items
      const updated = await this.invoiceRepo.findById(id);
      if (!updated) throw new NotFoundError(INVOICE_ERRORS.INVOICE_NOT_FOUND);
      return updated;
    });
  }

  // ─── finalizeInvoice ──────────────────────────────────────────────────────────

  async finalizeInvoice(id: string, orgId: string): Promise<InvoiceWithItems> {
    return this.execute("finalizeInvoice", async () => {
      const invoice = await this.validateInvoiceOrgAccess(id, orgId);

      if (invoice.invoiceStatus !== "DRAFT") {
        throw new ConflictError(INVOICE_ERRORS.INVOICE_NOT_DRAFT);
      }

      await this.invoiceRepo.updateStatus(id, "FINALIZED", { issuedAt: new Date() });

      const updated = await this.invoiceRepo.findById(id);
      if (!updated) throw new NotFoundError(INVOICE_ERRORS.INVOICE_NOT_FOUND);
      return updated;
    });
  }

  // ─── voidInvoice ──────────────────────────────────────────────────────────────

  async voidInvoice(id: string, orgId: string): Promise<InvoiceWithItems> {
    return this.execute("voidInvoice", async () => {
      const invoice = await this.validateInvoiceOrgAccess(id, orgId);

      if (invoice.invoiceStatus === "PAID") {
        throw new ConflictError("Cannot void a PAID invoice");
      }
      if (invoice.invoiceStatus === "VOID") {
        throw new ConflictError(INVOICE_ERRORS.INVOICE_ALREADY_VOID);
      }

      await this.invoiceRepo.updateStatus(id, "VOID");

      const updated = await this.invoiceRepo.findById(id);
      if (!updated) throw new NotFoundError(INVOICE_ERRORS.INVOICE_NOT_FOUND);
      return updated;
    });
  }

  // ─── getInvoice ───────────────────────────────────────────────────────────────

  async getInvoice(id: string, orgId: string): Promise<InvoiceWithItems> {
    return this.execute("getInvoice", async () => {
      return this.validateInvoiceOrgAccess(id, orgId);
    });
  }

  // ─── listInvoices ─────────────────────────────────────────────────────────────

  async listInvoices(
    filter: InvoiceFilterDtoType,
    orgId: string
  ): Promise<{ data: InvoiceWithItems[]; meta: PaginatedResult<Invoice>["meta"] }> {
    return this.execute("listInvoices", async () => {
      await this.validateHotelAccess(filter.hotelId, orgId);

      const invoiceFilter: InvoiceFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        bookingId: filter.bookingId,
        status: filter.status,
        page: filter.page,
        limit: filter.limit,
      };

      return this.invoiceRepo.findManyFiltered(invoiceFilter);
    });
  }

  // ─── generateInvoicePdf ───────────────────────────────────────────────────────

  async generateInvoicePdf(id: string, orgId: string): Promise<InvoiceWithItems> {
    return this.execute("generateInvoicePdf", async () => {
      return this.validateInvoiceOrgAccess(id, orgId);
    });
  }
}
