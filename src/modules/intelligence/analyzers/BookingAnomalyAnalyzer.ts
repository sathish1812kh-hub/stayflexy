// FILE: src/modules/intelligence/analyzers/BookingAnomalyAnalyzer.ts
import { prisma } from "@lib/prisma";

export interface AnomalyResult {
  anomalyType: string;
  riskScore: number;
  payload: Record<string, unknown>;
}

export class BookingAnomalyAnalyzer {
  // Detects unusual cancellation spikes: cancellations today vs 30-day average
  static async detectCancellationSpike(
    hotelId: string,
    orgId: string
  ): Promise<AnomalyResult | null> {
    const today = new Date();
    const startOfDay = new Date(today.toISOString().split("T")[0] + "T00:00:00.000Z");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [todayCancellations, historicalCancellations] = await Promise.all([
      prisma.booking.count({
        where: {
          hotelId,
          organizationId: orgId,
          status: "CANCELLED",
          cancelledAt: { gte: startOfDay },
        },
      }),
      prisma.booking.count({
        where: {
          hotelId,
          organizationId: orgId,
          status: "CANCELLED",
          cancelledAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    const avgDailyCancellations = historicalCancellations / 30;
    if (avgDailyCancellations === 0 && todayCancellations < 2) return null;

    const ratio =
      avgDailyCancellations > 0
        ? todayCancellations / avgDailyCancellations
        : todayCancellations;

    if (ratio < 2.0) return null; // less than 2x baseline — not anomalous

    const riskScore = Math.min(0.99, Math.log2(ratio) * 0.3);

    return {
      anomalyType: "UNUSUAL_CANCELLATION",
      riskScore: Math.round(riskScore * 1000) / 1000,
      payload: {
        todayCancellations,
        avgDailyCancellations: Math.round(avgDailyCancellations * 10) / 10,
        ratio: Math.round(ratio * 10) / 10,
        detectedAt: today.toISOString(),
      },
    };
  }

  // Detects payment amount mismatch: payment != booking.finalAmount
  static async detectPaymentAnomaly(
    hotelId: string,
    orgId: string
  ): Promise<AnomalyResult | null> {
    const recentPayments = await prisma.payment.findMany({
      where: {
        hotelId,
        organizationId: orgId,
        paymentStatus: "SUCCESS",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        amount: true,
        bookingId: true,
        booking: { select: { finalAmount: true } },
      },
      take: 50,
    });

    if (recentPayments.length === 0) return null;

    const mismatches = recentPayments.filter((p) => {
      const diff = Math.abs(
        p.amount.toNumber() - p.booking.finalAmount.toNumber()
      );
      return diff > 0.01; // allow for rounding
    });

    if (mismatches.length === 0) return null;

    const riskScore = Math.min(
      0.95,
      (mismatches.length / recentPayments.length) * 2
    );

    return {
      anomalyType: "PAYMENT_ANOMALY",
      riskScore: Math.round(riskScore * 1000) / 1000,
      payload: {
        mismatchCount: mismatches.length,
        totalChecked: recentPayments.length,
        mismatchRate:
          Math.round((mismatches.length / recentPayments.length) * 100) / 100,
        paymentIds: mismatches.map((m) => m.id).slice(0, 10),
      },
    };
  }
}
