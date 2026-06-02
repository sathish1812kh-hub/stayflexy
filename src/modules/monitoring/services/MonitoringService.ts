import { type Prisma } from "@prisma/client";
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { HealthChecker } from "../health/HealthChecker";
import type { SystemStatus, MetricsSnapshot, SystemServiceStatusType } from "../types";

const APP_VERSION = process.env["npm_package_version"] ?? "1.0.0";

export class MonitoringService extends BaseService {
  protected readonly moduleName = "MonitoringService";

  async getSystemStatus(): Promise<SystemStatus> {
    return this.execute("getSystemStatus", async () => {
      const results = await HealthChecker.runAll();
      const overall = HealthChecker.aggregateStatus(results);

      // Upsert health records to DB
      await Promise.allSettled(
        results.map((r) =>
          prisma.systemHealth.upsert({
            where: { serviceName: r.service },
            create: {
              serviceName: r.service,
              serviceStatus: r.status as SystemServiceStatusType,
              lastCheckedAt: new Date(),
              metadata: r.details as Prisma.InputJsonValue | undefined,
            },
            update: {
              serviceStatus: r.status as SystemServiceStatusType,
              lastCheckedAt: new Date(),
              metadata: r.details as Prisma.InputJsonValue | undefined,
            },
          })
        )
      );

      return {
        overall,
        checkedAt: new Date(),
        services: results,
        version: APP_VERSION,
      };
    });
  }

  async getMetrics(): Promise<MetricsSnapshot> {
    return this.execute("getMetrics", async () => {
      const dbCheck = await HealthChecker.checkDatabase();
      const mem = process.memoryUsage();

      const [jobCounts, notifCounts] = await Promise.all([
        prisma.backgroundJob.groupBy({
          by: ["jobStatus"],
          _count: { id: true },
        }),
        prisma.notification.groupBy({
          by: ["deliveryStatus"],
          _count: { id: true },
        }),
      ]);

      const jobMap = Object.fromEntries(jobCounts.map((j) => [j.jobStatus, j._count.id]));
      const notifMap = Object.fromEntries(notifCounts.map((n) => [n.deliveryStatus, n._count.id]));

      return {
        timestamp: new Date(),
        database: { healthy: dbCheck.status === "HEALTHY", latencyMs: dbCheck.latencyMs },
        jobs: {
          pending: jobMap["PENDING"] ?? 0,
          running: jobMap["RUNNING"] ?? 0,
          failed: jobMap["FAILED"] ?? 0,
          deadLetter: jobMap["DEAD_LETTER"] ?? 0,
        },
        notifications: {
          pending: notifMap["PENDING"] ?? 0,
          failed: notifMap["FAILED"] ?? 0,
        },
        memory: {
          heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        },
        uptime: Math.round(process.uptime()),
      };
    });
  }
}
