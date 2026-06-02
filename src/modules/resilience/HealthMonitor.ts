export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  checkedAt: string;
}

export interface SystemHealth {
  overall: HealthStatus;
  components: ComponentHealth[];
  checkedAt: string;
}

export type HealthCheckFn = () => Promise<ComponentHealth>;

export class HealthMonitor {
  private readonly checks: Map<string, HealthCheckFn> = new Map();

  register(name: string, check: HealthCheckFn): void {
    this.checks.set(name, check);
  }

  async check(): Promise<SystemHealth> {
    const results = await Promise.allSettled(
      Array.from(this.checks.entries()).map(async ([name, fn]) => {
        const start = Date.now();
        try {
          const result = await fn();
          return { ...result, latencyMs: result.latencyMs ?? Date.now() - start };
        } catch (err) {
          return {
            name,
            status: "unhealthy" as HealthStatus,
            latencyMs: Date.now() - start,
            message: err instanceof Error ? err.message : "Check failed",
            checkedAt: new Date().toISOString(),
          };
        }
      })
    );

    const components: ComponentHealth[] = results.map((r) =>
      r.status === "fulfilled" ? r.value : {
        name: "unknown",
        status: "unhealthy" as HealthStatus,
        message: "Promise rejected",
        checkedAt: new Date().toISOString(),
      }
    );

    const hasUnhealthy = components.some((c) => c.status === "unhealthy");
    const hasDegraded = components.some((c) => c.status === "degraded");
    const overall: HealthStatus = hasUnhealthy ? "unhealthy" : hasDegraded ? "degraded" : "healthy";

    return { overall, components, checkedAt: new Date().toISOString() };
  }
}
