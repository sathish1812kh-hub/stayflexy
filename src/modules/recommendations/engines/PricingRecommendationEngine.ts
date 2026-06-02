// FILE: src/modules/recommendations/engines/PricingRecommendationEngine.ts
import { prisma } from "@lib/prisma";
import type { ScoredRecommendation } from "../types";

export class PricingRecommendationEngine {
  static async score(hotelId: string, orgId: string): Promise<ScoredRecommendation | null> {
    // 1. Get current occupancy: booked rooms / total rooms today
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { totalRooms: true, currency: true },
    });
    if (!hotel || hotel.totalRooms === 0) return null;

    const today = new Date();

    const occupiedRooms = await prisma.bookingRoom.count({
      where: {
        hotelId,
        checkInDate: { lte: today },
        checkOutDate: { gt: today },
        status: { not: "CANCELLED" },
      },
    });

    const occupancyRate = occupiedRooms / hotel.totalRooms;

    // 2. Get last 30 days average occupancy from revenue metrics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const metrics = await prisma.revenueMetric.findMany({
      where: { hotelId, metricDate: { gte: thirtyDaysAgo } },
      select: { occupancyRate: true, adr: true },
    });

    if (metrics.length === 0) return null;

    const avgOccupancy =
      metrics.reduce((s, m) => s + m.occupancyRate.toNumber(), 0) / metrics.length;
    const avgAdr =
      metrics.reduce((s, m) => s + m.adr.toNumber(), 0) / metrics.length;

    // 3. Score: how much does current occupancy deviate from average?
    const deviation = occupancyRate - avgOccupancy;
    const absDeviation = Math.abs(deviation);

    if (absDeviation < 0.05) return null; // within 5% — no adjustment needed

    // Confidence: proportional to deviation magnitude, capped at 0.95
    const confidence = Math.min(0.95, absDeviation * 2);

    const adjustmentPct =
      deviation > 0
        ? Math.round(deviation * 30) // high occupancy → suggest 30% per 1.0 above avg
        : Math.round(deviation * 20); // low occupancy → suggest 20% discount per 1.0 below avg

    return {
      type: "PRICING_ADJUSTMENT",
      score: Math.round(confidence * 1000) / 1000,
      explanation: `Current occupancy ${Math.round(occupancyRate * 100)}% vs ${Math.round(avgOccupancy * 100)}% 30-day average. Suggest ${adjustmentPct > 0 ? "+" : ""}${adjustmentPct}% rate adjustment from avg ADR of ${avgAdr.toFixed(2)}.`,
      payload: {
        currentOccupancyRate: Math.round(occupancyRate * 100) / 100,
        avgOccupancyRate: Math.round(avgOccupancy * 100) / 100,
        avgAdr,
        suggestedAdjustmentPct: adjustmentPct,
        currency: hotel.currency,
      },
    };
  }
}
