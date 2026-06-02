// FILE: src/modules/intelligence/analyzers/OperationalAnomalyAnalyzer.ts
import { prisma } from "@lib/prisma";
import type { AnomalyResult } from "./BookingAnomalyAnalyzer";

export class OperationalAnomalyAnalyzer {
  // Detects operational task delays: overdue tasks ratio
  static async detectOperationalDelay(
    hotelId: string,
    orgId: string
  ): Promise<AnomalyResult | null> {
    const now = new Date();
    const allActive = await prisma.operationalTask.findMany({
      where: {
        hotelId,
        organizationId: orgId,
        taskStatus: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { not: null },
      },
      select: { dueDate: true },
    });

    if (allActive.length < 3) return null;

    const overdue = allActive.filter((t) => t.dueDate !== null && t.dueDate < now).length;
    const overdueRate = overdue / allActive.length;

    if (overdueRate < 0.25) return null;

    const riskScore = Math.min(0.90, overdueRate * 1.1);

    return {
      anomalyType: "OPERATIONAL_DELAY",
      riskScore: Math.round(riskScore * 1000) / 1000,
      payload: {
        overdueTasks: overdue,
        totalActiveTasks: allActive.length,
        overdueRate: Math.round(overdueRate * 100) / 100,
        recommendation: "Review task priorities and reassign overdue items",
      },
    };
  }
}
