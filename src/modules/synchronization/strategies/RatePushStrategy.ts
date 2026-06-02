// FILE: src/modules/synchronization/strategies/RatePushStrategy.ts
import type { ISyncStrategy, SyncStrategyResult } from "./SyncStrategy";
import type { SyncJob } from "../types";

export class RatePushStrategy implements ISyncStrategy {
  readonly syncType = "RATE_PUSH";

  async execute(job: SyncJob): Promise<SyncStrategyResult> {
    // Abstraction-ready: fetch rate plans for job.hotelId,
    // get OTA mapping, call adapter.pushRates(), return result.
    // Real implementation wired when external OTA credentials are configured.
    return {
      success: true,
      recordsProcessed: 0,
      errors: [],
      metadata: { hotelId: job.hotelId, providerId: job.providerId },
    };
  }
}
