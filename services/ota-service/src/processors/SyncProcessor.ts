import type { ISyncJobRepository } from '../domain/repositories/ISyncJobRepository'
import type { IOtaProviderRepository } from '../domain/repositories/IOtaProviderRepository'
import type { IOtaMappingRepository } from '../domain/repositories/IOtaMappingRepository'
import type { OtaDistributedLock } from '../infrastructure/locking/OtaDistributedLock'
import type { OtaEventPublisher } from '../infrastructure/events/OtaEventPublisher'
import type { AdapterFactory } from '../adapters/AdapterFactory'
import type { Logger } from '@stayflexi/shared-logger'

export class SyncProcessor {
  constructor(
    private readonly syncJobRepo: ISyncJobRepository,
    private readonly providerRepo: IOtaProviderRepository,
    private readonly mappingRepo: IOtaMappingRepository,
    private readonly lock: OtaDistributedLock,
    private readonly eventPublisher: OtaEventPublisher,
    private readonly adapterFactory: AdapterFactory,
    private readonly logger: Logger,
  ) {}

  async processRetries(): Promise<void> {
    const pendingRetries = await this.syncJobRepo.findPendingRetries()

    if (pendingRetries.length === 0) {
      this.logger.debug('No OTA sync jobs pending retry')
      return
    }

    this.logger.info({ count: pendingRetries.length }, 'Processing OTA sync retries')

    for (const job of pendingRetries) {
      if (!job.canRetry()) {
        this.logger.warn(
          { jobId: job.id, syncType: job.syncType, retryCount: job.retryCount, maxRetries: job.maxRetries },
          'OTA sync job exceeded max retries, marking as FAILED',
        )
        await this.syncJobRepo.updateStatus(job.id, 'FAILED', {
          errorMessage: `Max retries (${job.maxRetries}) exceeded`,
          completedAt: new Date(),
        })

        this.eventPublisher.publishSyncFailed({
          syncJobId: job.id,
          organizationId: job.organizationId,
          hotelId: job.hotelId,
          providerId: job.providerId,
          syncType: job.syncType,
          errorMessage: `Max retries (${job.maxRetries}) exceeded`,
          retryCount: job.retryCount,
        })
        continue
      }

      try {
        const updated = await this.syncJobRepo.incrementRetry(job.id)
        await this.syncJobRepo.appendEvent(updated.id, 'RETRY_INITIATED', {
          retryCount: updated.retryCount,
          maxRetries: updated.maxRetries,
        })

        this.logger.info(
          {
            jobId: job.id,
            syncType: job.syncType,
            retryCount: updated.retryCount,
            maxRetries: updated.maxRetries,
          },
          'OTA sync job retry initiated',
        )

        // Emit event so downstream consumers can re-enqueue the job
        this.eventPublisher.publishSyncStarted({
          syncJobId: job.id,
          organizationId: job.organizationId,
          hotelId: job.hotelId,
          providerId: job.providerId,
          syncType: job.syncType,
        })
      } catch (err) {
        this.logger.error({ jobId: job.id, err }, 'Failed to process OTA sync retry')
      }
    }
  }
}
