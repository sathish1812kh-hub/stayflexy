// FILE: src/modules/synchronization/strategies/ReconciliationStrategy.ts
import type { ISyncStrategy, SyncStrategyResult } from "./SyncStrategy";
import type { SyncJob } from "../types";

export class ReconciliationStrategy implements ISyncStrategy {
  readonly syncType = "RECONCILIATION";

  async execute(job: SyncJob): Promise<SyncStrategyResult> {
    // Abstraction-ready: compare local booking/inventory state against OTA records,
    // identify discrepancies, and emit reconciliation events for manual review.
    // Real implementation wired when external OTA credentials are configured.
    return {
      success: true,
      recordsProcessed: 0,
      errors: [],
      metadata: { hotelId: job.hotelId, providerId: job.providerId },
    };
  }
}
