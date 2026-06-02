// FILE: src/modules/analytics/aggregators/PaymentAggregator.ts
import { prisma } from "@lib/prisma";
import type { PaymentAnalytics } from "../types";

export class PaymentAggregator {
  static async aggregate(
    hotelId: string,
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PaymentAnalytics> {
    const payments = await prisma.payment.findMany({
      where: {
        hotelId,
        organizationId: orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { id: true, paymentStatus: true, paymentMethod: true, amount: true },
    });

    const refunds = await prisma.refund.findMany({
      where: {
        payment: { hotelId, organizationId: orgId },
        refundStatus: "SUCCESS",
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { refundAmount: true },
    });

    const total = payments.length;
    const successful = payments.filter((p) => p.paymentStatus === "SUCCESS").length;
    let totalRevenue = 0;
    const byMethod: Record<string, number> = {};

    for (const p of payments) {
      if (p.paymentStatus === "SUCCESS") {
        totalRevenue += p.amount.toNumber();
        const method = p.paymentMethod as string;
        byMethod[method] = (byMethod[method] ?? 0) + p.amount.toNumber();
      }
    }

    const refundedAmount = refunds.reduce(
      (s, r) => s + r.refundAmount.toNumber(),
      0
    );

    return {
      hotelId,
      period: { start: startDate, end: endDate },
      totalPayments: total,
      successfulPayments: successful,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      byMethod,
      refundedAmount: Math.round(refundedAmount * 100) / 100,
    };
  }
}
