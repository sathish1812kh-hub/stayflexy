// FILE: src/modules/synchronization/strategies/ReservationPullStrategy.ts
import type { ISyncStrategy, SyncStrategyResult } from "./SyncStrategy";
import type { SyncJob } from "../types";

export class ReservationPullStrategy implements ISyncStrategy {
  readonly syncType = "RESERVATION_PULL";

  async execute(job: SyncJob): Promise<SyncStrategyResult> {
    // Abstraction-ready: call OTA adapter.pullReservations() for job.hotelId,
    // persist raw payloads as OTAReservation records, return result.
    // Real implementation wired when external OTA credentials are configured.
    return {
      success: true,
      recordsProcessed: 0,
      errors: [],
      metadata: { hotelId: job.hotelId, providerId: job.providerId },
    };
  }
}
