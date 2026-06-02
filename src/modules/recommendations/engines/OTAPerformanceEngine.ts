// FILE: src/modules/recommendations/engines/OTAPerformanceEngine.ts
import { prisma } from "@lib/prisma";
import type { ScoredRecommendation } from "../types";

export class OTAPerformanceEngine {
  static async score(hotelId: string, orgId: string): Promise<ScoredRecommendation | null> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const reservations = await prisma.oTAReservation.findMany({
      where: { hotelId, organizationId: orgId, createdAt: { gte: thirtyDaysAgo } },
      select: {
        syncStatus: true,
        providerId: true,
        provider: { select: { providerCode: true } },
      },
    });

    if (reservations.length === 0) return null;

    const failed = reservations.filter((r) => r.syncStatus === "FAILED").length;
    const failureRate = failed / reservations.length;

    if (failureRate < 0.05) return null; // under 5% failure — acceptable

    const confidence = Math.min(0.90, failureRate * 3);

    const byProvider: Record<string, { total: number; failed: number }> = {};
    for (const r of reservations) {
      const code = r.provider.providerCode;
      const entry = byProvider[code] ?? { total: 0, failed: 0 };
      entry.total++;
      if (r.syncStatus === "FAILED") entry.failed++;
      byProvider[code] = entry;
    }

    return {
      type: "OTA_PERFORMANCE",
      score: Math.round(confidence * 1000) / 1000,
      explanation: `OTA reservation failure rate is ${Math.round(failureRate * 100)}% over the last 30 days. Review channel manager configuration and API credentials.`,
      payload: {
        totalReservations: reservations.length,
        failedReservations: failed,
        failureRate: Math.round(failureRate * 100) / 100,
        byProvider,
        actionSuggestions: [
          "Review OTA API credentials",
          "Check channel manager mapping",
          "Contact provider support",
        ],
      },
    };
  }
}
