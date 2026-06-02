// FILE: src/modules/recommendations/engines/StaffingRecommendationEngine.ts
import { prisma } from "@lib/prisma";
import type { ScoredRecommendation } from "../types";

export class StaffingRecommendationEngine {
  static async score(hotelId: string, orgId: string): Promise<ScoredRecommendation | null> {
    // Check housekeeping task distribution
    const pendingTasks = await prisma.housekeepingTask.findMany({
      where: {
        hotelId,
        organizationId: orgId,
        taskStatus: { in: ["PENDING", "ASSIGNED"] },
      },
      select: { assignedTo: true },
    });

    if (pendingTasks.length < 3) return null;

    const staffCounts: Record<string, number> = {};
    let unassigned = 0;

    for (const t of pendingTasks) {
      if (!t.assignedTo) {
        unassigned++;
        continue;
      }
      staffCounts[t.assignedTo] = (staffCounts[t.assignedTo] ?? 0) + 1;
    }

    const counts = Object.values(staffCounts);
    if (counts.length < 2) return null;

    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const imbalanceRatio = max > 0 ? (max - min) / max : 0;

    if (imbalanceRatio < 0.3 && unassigned === 0) return null;

    const confidence = Math.min(
      0.85,
      imbalanceRatio + (unassigned / pendingTasks.length) * 0.3
    );

    return {
      type: "STAFFING_ADJUSTMENT",
      score: Math.round(confidence * 1000) / 1000,
      explanation: `Housekeeping workload imbalance detected. Max tasks per staff: ${max}, Min: ${min}. ${unassigned} tasks unassigned. Rebalance task assignments.`,
      payload: {
        totalPendingTasks: pendingTasks.length,
        unassignedTasks: unassigned,
        maxTasksPerStaff: max,
        minTasksPerStaff: min,
        imbalanceRatio: Math.round(imbalanceRatio * 100) / 100,
        recommendation: "Reassign tasks from overloaded staff to available staff",
      },
    };
  }
}
