// FILE: src/modules/synchronization/strategies/SyncStrategy.ts
import type { SyncJob } from "../types";

export interface SyncStrategyResult {
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  metadata?: Record<string, unknown>;
}

// Contract all sync strategies must implement
export interface ISyncStrategy {
  readonly syncType: string;
  execute(job: SyncJob): Promise<SyncStrategyResult>;
}
