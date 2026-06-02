// FILE: src/modules/intelligence/analyzers/OTAAnomalyAnalyzer.ts
import { prisma } from "@lib/prisma";
import type { AnomalyResult } from "./BookingAnomalyAnalyzer";

export class OTAAnomalyAnalyzer {
  static async detectSyncFailures(
    hotelId: string,
    orgId: string
  ): Promise<AnomalyResult | null> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentJobs = await prisma.syncJob.findMany({
      where: { hotelId, organizationId: orgId, createdAt: { gte: oneHourAgo } },
      select: { syncStatus: true, syncType: true },
      take: 100,
    });

    if (recentJobs.length === 0) return null;

    const failed = recentJobs.filter((j) => j.syncStatus === "FAILED").length;
    const failureRate = failed / recentJobs.length;

    if (failureRate < 0.20) return null; // under 20% failure rate in last hour

    const riskScore = Math.min(0.95, failureRate * 1.2);

    return {
      anomalyType: "OTA_SYNC_FAILURE",
      riskScore: Math.round(riskScore * 1000) / 1000,
      payload: {
        failedJobs: failed,
        totalJobs: recentJobs.length,
        failureRate: Math.round(failureRate * 100) / 100,
        timeWindow: "1 hour",
      },
    };
  }
}
