// FILE: src/modules/invoice/services/BillingService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { ForbiddenError } from "@errors/HttpError";
import type { PrismaInvoiceRepository } from "../repositories/PrismaInvoiceRepository";
import type { BillingQueryDtoType } from "../dto";

export interface BillingSummary {
  hotelId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  invoices: {
    total: number;
    draft: number;
    finalized: number;
    paid: number;
    void: number;
    totalAmount: number;
  };
  payments: {
    total: number;
    totalAmount: number;
    byMethod: Record<string, number>;
  };
  outstanding: number;
}

export class BillingService extends BaseService {
  protected readonly moduleName = "BillingService";

  constructor(private readonly invoiceRepo: PrismaInvoiceRepository) {
    super();
  }

  // ─── getBillingSummary ────────────────────────────────────────────────────────

  async getBillingSummary(
    dto: BillingQueryDtoType,
    orgId: string
  ): Promise<BillingSummary> {
    return this.execute("getBillingSummary", async () => {
      // 1. Validate hotel org access
      const hotel = await prisma.hotel.findFirst({
        where: { id: dto.hotelId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!hotel) throw new ForbiddenError("Hotel not found or access denied");

      // 2. Build date range
      const startDate = new Date(`${dto.startDate}T00:00:00.000Z`);
      const endDate = new Date(`${dto.endDate}T23:59:59.999Z`);

      // 3. Query invoices in date range (issuedAt between startDate and endDate)
      const invoiceRecords = await prisma.invoice.findMany({
        where: {
          hotelId: dto.hotelId,
          organizationId: orgId,
          issuedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          invoiceStatus: true,
          totalAmount: true,
        },
      });

      // Calculate invoice summary
      let invoiceTotalAmount = 0;
      let draftCount = 0;
      let finalizedCount = 0;
      let paidCount = 0;
      let voidCount = 0;
      let finalizedTotalAmount = 0;

      for (const inv of invoiceRecords) {
        const amount = inv.totalAmount.toNumber();
        invoiceTotalAmount += amount;
        switch (inv.invoiceStatus) {
          case "DRAFT":
            draftCount++;
            break;
          case "FINALIZED":
            finalizedCount++;
            finalizedTotalAmount += amount;
            break;
          case "PAID":
            paidCount++;
            break;
          case "VOID":
            voidCount++;
            break;
        }
      }

      // 4. Query payments in same range
      const paymentRecords = await prisma.payment.findMany({
        where: {
          hotelId: dto.hotelId,
          organizationId: orgId,
          paymentStatus: "SUCCESS",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          amount: true,
          paymentMethod: true,
        },
      });

      let paymentTotalAmount = 0;
      const byMethod: Record<string, number> = {};

      for (const pmt of paymentRecords) {
        const amount = pmt.amount.toNumber();
        paymentTotalAmount += amount;
        const method = pmt.paymentMethod as string;
        byMethod[method] = (byMethod[method] ?? 0) + amount;
      }

      // 5. Outstanding = finalized invoices totalAmount - paid payment amounts
      const outstanding =
        Math.round((finalizedTotalAmount - paymentTotalAmount) * 100) / 100;

      return {
        hotelId: dto.hotelId,
        period: {
          startDate: dto.startDate,
          endDate: dto.endDate,
        },
        invoices: {
          total: invoiceRecords.length,
          draft: draftCount,
          finalized: finalizedCount,
          paid: paidCount,
          void: voidCount,
          totalAmount: Math.round(invoiceTotalAmount * 100) / 100,
        },
        payments: {
          total: paymentRecords.length,
          totalAmount: Math.round(paymentTotalAmount * 100) / 100,
          byMethod,
        },
        outstanding,
      };
    });
  }
}
