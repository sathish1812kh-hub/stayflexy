// FILE: src/modules/synchronization/strategies/ReservationImportStrategy.ts
import type { ISyncStrategy, SyncStrategyResult } from "./SyncStrategy";
import type { SyncJob } from "../types";

export class ReservationImportStrategy implements ISyncStrategy {
  readonly syncType = "RESERVATION_IMPORT";

  async execute(job: SyncJob): Promise<SyncStrategyResult> {
    // Abstraction-ready: query PENDING OTAReservations for job.hotelId + job.providerId,
    // convert and create Booking records, mark as IMPORTED, return result.
    // Real implementation wired when external OTA credentials are configured.
    return {
      success: true,
      recordsProcessed: 0,
      errors: [],
      metadata: { hotelId: job.hotelId, providerId: job.providerId },
    };
  }
}
