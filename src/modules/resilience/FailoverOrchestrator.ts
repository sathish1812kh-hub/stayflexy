import type { HealthMonitor } from "./HealthMonitor";

export type FailoverMode = "ACTIVE_PASSIVE" | "ACTIVE_ACTIVE" | "MANUAL";

export interface FailoverResult {
  triggered: boolean;
  mode: FailoverMode;
  reason: string;
  timestamp: string;
}

export class FailoverOrchestrator {
  private mode: FailoverMode = "MANUAL";
  private activeRegion = "primary";

  constructor(private readonly healthMonitor: HealthMonitor) {}

  setMode(mode: FailoverMode): void {
    this.mode = mode;
  }

  async triggerFailover(reason: string): Promise<FailoverResult> {
    this.activeRegion = this.activeRegion === "primary" ? "secondary" : "primary";

    return {
      triggered: true,
      mode: this.mode,
      reason,
      timestamp: new Date().toISOString(),
    };
  }

  async evaluateAutoFailover(): Promise<FailoverResult | null> {
    if (this.mode !== "ACTIVE_PASSIVE") return null;

    const health = await this.healthMonitor.check();
    if (health.overall === "unhealthy") {
      return this.triggerFailover("Automatic failover: system health is unhealthy");
    }
    return null;
  }

  getActiveRegion(): string {
    return this.activeRegion;
  }
}
