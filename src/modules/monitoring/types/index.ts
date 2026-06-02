export type SystemServiceStatusType = "HEALTHY" | "DEGRADED" | "DOWN" | "UNKNOWN";

export interface SystemHealth {
  id: string;
  serviceName: string;
  serviceStatus: SystemServiceStatusType;
  lastCheckedAt: Date;
  metadata: Record<string, unknown> | null;
}

export interface HealthCheckResult {
  service: string;
  status: SystemServiceStatusType;
  latencyMs: number;
  details?: Record<string, unknown>;
}

export interface SystemStatus {
  overall: SystemServiceStatusType;
  checkedAt: Date;
  services: HealthCheckResult[];
  version: string;
}

export interface MetricsSnapshot {
  timestamp: Date;
  database: { healthy: boolean; latencyMs: number };
  jobs: { pending: number; running: number; failed: number; deadLetter: number };
  notifications: { pending: number; failed: number };
  memory: { heapUsedMb: number; heapTotalMb: number };
  uptime: number;
}
