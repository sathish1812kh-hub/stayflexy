import { HealthMonitor } from "./HealthMonitor";
import { FailoverOrchestrator } from "./FailoverOrchestrator";
import { CircuitBreaker } from "./CircuitBreaker";

export const healthMonitor = new HealthMonitor();
export const failoverOrchestrator = new FailoverOrchestrator(healthMonitor);

export const circuitBreakers = {
  database: new CircuitBreaker("database", { failureThreshold: 3, timeoutMs: 15_000 }),
  redis: new CircuitBreaker("redis", { failureThreshold: 5, timeoutMs: 10_000 }),
  queue: new CircuitBreaker("queue", { failureThreshold: 5, timeoutMs: 10_000 }),
};

// Register built-in health checks
healthMonitor.register("database", async () => {
  const start = Date.now();
  try {
    const { prisma } = await import("@lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    return { name: "database", status: "healthy" as const, latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
  } catch {
    return { name: "database", status: "unhealthy" as const, latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
  }
});

healthMonitor.register("api", async () => ({
  name: "api",
  status: "healthy" as const,
  latencyMs: 0,
  checkedAt: new Date().toISOString(),
}));
