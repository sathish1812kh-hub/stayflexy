import { prisma } from "@lib/prisma";
import type { HealthCheckResult, SystemServiceStatusType } from "../types";

export class HealthChecker {
  static async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        service: "database",
        status: "HEALTHY",
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        service: "database",
        status: "DOWN",
        latencyMs: Date.now() - start,
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  static async checkPrisma(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await prisma.hotel.count({ where: { deletedAt: null } });
      return { service: "prisma", status: "HEALTHY", latencyMs: Date.now() - start };
    } catch (error) {
      return {
        service: "prisma",
        status: "DOWN",
        latencyMs: Date.now() - start,
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      };
    }
  }

  static checkMemory(): HealthCheckResult {
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
    const usageRatio = heapUsedMb / heapTotalMb;

    const status: SystemServiceStatusType =
      usageRatio > 0.9 ? "DOWN" : usageRatio > 0.75 ? "DEGRADED" : "HEALTHY";

    return {
      service: "memory",
      status,
      latencyMs: 0,
      details: { heapUsedMb, heapTotalMb, usagePercent: Math.round(usageRatio * 100) },
    };
  }

  static async runAll(): Promise<HealthCheckResult[]> {
    const [db, prismaCheck, memory] = await Promise.all([
      HealthChecker.checkDatabase(),
      HealthChecker.checkPrisma(),
      Promise.resolve(HealthChecker.checkMemory()),
    ]);
    return [db, prismaCheck, memory];
  }

  static aggregateStatus(results: HealthCheckResult[]): SystemServiceStatusType {
    if (results.some((r) => r.status === "DOWN")) return "DOWN";
    if (results.some((r) => r.status === "DEGRADED")) return "DEGRADED";
    if (results.every((r) => r.status === "HEALTHY")) return "HEALTHY";
    return "UNKNOWN";
  }
}
