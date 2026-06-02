// FILE: src/modules/synchronization/strategies/InventoryPushStrategy.ts
import type { ISyncStrategy, SyncStrategyResult } from "./SyncStrategy";
import type { SyncJob } from "../types";

export class InventoryPushStrategy implements ISyncStrategy {
  readonly syncType = "INVENTORY_PUSH";

  async execute(job: SyncJob): Promise<SyncStrategyResult> {
    // Abstraction-ready: fetch inventory records for job.hotelId,
    // get OTA mapping, call adapter.pushInventory(), return result.
    // Real implementation wired when external OTA credentials are configured.
    return {
      success: true,
      recordsProcessed: 0,
      errors: [],
      metadata: { hotelId: job.hotelId, providerId: job.providerId },
    };
  }
}
