// FILE: src/modules/analytics/aggregators/OTAAggregator.ts
import { prisma } from "@lib/prisma";
import type { OTAAnalytics } from "../types";

export class OTAAggregator {
  static async aggregate(
    hotelId: string,
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OTAAnalytics> {
    const reservations = await prisma.oTAReservation.findMany({
      where: {
        hotelId,
        organizationId: orgId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        syncStatus: true,
        providerId: true,
        provider: { select: { providerCode: true } },
      },
    });

    const total = reservations.length;
    const imported = reservations.filter((r) => r.syncStatus === "IMPORTED").length;
    const failed = reservations.filter((r) => r.syncStatus === "FAILED").length;
    const duplicate = reservations.filter((r) => r.syncStatus === "DUPLICATE").length;

    const byProvider: Record<string, number> = {};
    for (const r of reservations) {
      const code = r.provider.providerCode;
      byProvider[code] = (byProvider[code] ?? 0) + 1;
    }

    const importSuccessRate =
      total > 0 ? Math.round((imported / total) * 10000) / 100 : 0;

    return {
      hotelId,
      period: { start: startDate, end: endDate },
      totalReservations: total,
      importedCount: imported,
      failedCount: failed,
      duplicateCount: duplicate,
      byProvider,
      importSuccessRate,
    };
  }
}
