// FILE: src/modules/analytics/aggregators/OperationsAggregator.ts
import { prisma } from "@lib/prisma";
import type { OperationsAnalytics } from "../types";

export class OperationsAggregator {
  static async aggregate(
    hotelId: string,
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OperationsAnalytics> {
    const [hkTasks, mainTickets] = await Promise.all([
      prisma.housekeepingTask.findMany({
        where: {
          hotelId,
          organizationId: orgId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { taskStatus: true },
      }),
      prisma.maintenanceTicket.findMany({
        where: {
          hotelId,
          organizationId: orgId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { ticketStatus: true },
      }),
    ]);

    const totalHK = hkTasks.length;
    const completedHK = hkTasks.filter(
      (t) => t.taskStatus === "COMPLETED" || t.taskStatus === "VERIFIED"
    ).length;
    const pendingHK = hkTasks.filter(
      (t) => t.taskStatus === "PENDING" || t.taskStatus === "ASSIGNED"
    ).length;
    const avgCompletionRate =
      totalHK > 0 ? Math.round((completedHK / totalHK) * 10000) / 100 : 0;

    const totalMT = mainTickets.length;
    const resolvedMT = mainTickets.filter(
      (t) => t.ticketStatus === "RESOLVED" || t.ticketStatus === "CLOSED"
    ).length;
    const openMT = mainTickets.filter(
      (t) =>
        t.ticketStatus === "OPEN" ||
        t.ticketStatus === "ASSIGNED" ||
        t.ticketStatus === "IN_PROGRESS"
    ).length;

    return {
      hotelId,
      period: { start: startDate, end: endDate },
      totalHousekeepingTasks: totalHK,
      completedTasks: completedHK,
      pendingTasks: pendingHK,
      avgCompletionRate,
      totalMaintenanceTickets: totalMT,
      resolvedTickets: resolvedMT,
      openTickets: openMT,
    };
  }
}
