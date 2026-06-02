import { NotFoundError, ConflictError } from '@stayflexi/shared-errors'
import type { IOtaProviderRepository } from '../../domain/repositories/IOtaProviderRepository'
import type { IOtaMappingRepository } from '../../domain/repositories/IOtaMappingRepository'
import type { ISyncJobRepository } from '../../domain/repositories/ISyncJobRepository'
import type { IOtaReservationRepository } from '../../domain/repositories/IOtaReservationRepository'
import type { SyncJob } from '../../domain/entities/SyncJob'
import type { OtaSyncCache } from '../../infrastructure/cache/OtaSyncCache'
import type { OtaDistributedLock } from '../../infrastructure/locking/OtaDistributedLock'
import type { OtaEventPublisher } from '../../infrastructure/events/OtaEventPublisher'
import type { AdapterFactory } from '../../adapters/AdapterFactory'
import type { SyncReservationsDto } from '../dtos/ota.dto'
import type { Logger } from '@stayflexi/shared-logger'

export class SyncReservations {
  constructor(
    private readonly providerRepo: IOtaProviderRepository,
    private readonly mappingRepo: IOtaMappingRepository,
    private readonly syncJobRepo: ISyncJobRepository,
    private readonly reservationRepo: IOtaReservationRepository,
    private readonly cache: OtaSyncCache,
    private readonly lock: OtaDistributedLock,
    private readonly eventPublisher: OtaEventPublisher,
    private readonly adapterFactory: AdapterFactory,
    private readonly logger: Logger,
  ) {}

  async execute(
    dto: SyncReservationsDto,
    organizationId: string,
    userId: string,
    correlationId?: string,
  ): Promise<SyncJob> {
    const provider = await this.providerRepo.findById(dto.providerId)
    if (!provider) throw new NotFoundError(`OTA provider not found: ${dto.providerId}`)
    if (!provider.isActive()) throw new ConflictError(`OTA provider is not active: ${provider.providerCode}`)

    const mappings = await this.mappingRepo.findByHotelAndProvider(dto.hotelId, dto.providerId)
    const activeMapping = mappings.find(m => m.isActive)
    if (!activeMapping) {
      throw new NotFoundError(
        `No active OTA mapping for hotel ${dto.hotelId} with provider ${provider.providerCode}`,
      )
    }
    if (!activeMapping.belongsToOrganization(organizationId)) {
      throw new ConflictError('OTA mapping does not belong to your organization')
    }

    const idempotencyKey = `${dto.hotelId}:${dto.providerId}:RESERVATION_PULL:${dto.dateFrom}:${dto.dateTo}`

    const cachedJobId = await this.cache.getIdempotencyResult(idempotencyKey)
    if (cachedJobId) {
      const cachedJob = await this.syncJobRepo.findById(cachedJobId)
      if (cachedJob && !cachedJob.isCompleted()) return cachedJob
    }

    const existingJob = await this.syncJobRepo.findByIdempotencyKey(idempotencyKey)
    if (existingJob && !existingJob.isCompleted()) return existingJob

    const job = await this.syncJobRepo.create({
      organizationId,
      hotelId: dto.hotelId,
      providerId: dto.providerId,
      syncType: 'RESERVATION_PULL',
      idempotencyKey,
      payload: { dateFrom: dto.dateFrom, dateTo: dto.dateTo },
      createdById: userId,
      maxRetries: 3,
    })

    await this.cache.setIdempotencyResult(idempotencyKey, job.id)
    await this.syncJobRepo.appendEvent(job.id, 'SYNC_STARTED', { syncType: 'RESERVATION_PULL' })

    this.eventPublisher.publishSyncStarted({
      syncJobId: job.id,
      organizationId,
      hotelId: dto.hotelId,
      providerId: dto.providerId,
      syncType: 'RESERVATION_PULL',
      correlationId,
    })

    setImmediate(() => {
      void this.executeReservationSync(
        job.id,
        activeMapping.externalHotelId,
        dto,
        organizationId,
        dto.providerId,
        provider.providerCode,
        correlationId,
      )
    })

    return job
  }

  private async executeReservationSync(
    jobId: string,
    externalHotelId: string,
    dto: SyncReservationsDto,
    organizationId: string,
    providerId: string,
    providerCode: string,
    correlationId?: string,
  ): Promise<void> {
    const lockResource = `reservations:${dto.hotelId}:${providerId}`
    const startedAt = Date.now()

    try {
      await this.lock.withLock(lockResource, async () => {
        await this.syncJobRepo.updateStatus(jobId, 'RUNNING', { startedAt: new Date() })

        const adapter = this.adapterFactory.getAdapter(providerCode)
        const response = await adapter.pullReservations({
          hotelId: dto.hotelId,
          externalHotelId,
          organizationId,
          dateFrom: dto.dateFrom,
          dateTo: dto.dateTo,
          correlationId,
        })

        let imported = 0
        let duplicates = 0
        let failed = 0

        for (const externalRes of response.reservations) {
          try {
            // Deduplication check
            const existing = await this.reservationRepo.findByExternalId(
              providerId,
              externalRes.externalReservationId,
            )

            if (existing) {
              duplicates++
              this.logger.debug(
                { externalReservationId: externalRes.externalReservationId },
                'Duplicate OTA reservation skipped',
              )
              continue
            }

            // Check Redis dedup cache
            const isDup = await this.cache.checkReservationDedup(
              providerId,
              externalRes.externalReservationId,
            )
            if (isDup) {
              duplicates++
              continue
            }

            await this.reservationRepo.create({
              organizationId,
              hotelId: dto.hotelId,
              providerId,
              externalReservationId: externalRes.externalReservationId,
              rawPayload: externalRes.rawPayload,
              syncStatus: 'PENDING',
            })

            await this.syncJobRepo.appendEvent(jobId, 'RESERVATION_RECEIVED', {
              externalReservationId: externalRes.externalReservationId,
            })
            imported++
          } catch (err) {
            failed++
            this.logger.warn(
              { err, externalReservationId: externalRes.externalReservationId },
              'Failed to persist OTA reservation',
            )
          }
        }

        const status = failed === 0 ? 'SUCCESS' : imported > 0 ? 'SUCCESS' : 'FAILED'

        await this.syncJobRepo.updateStatus(jobId, status, {
          completedAt: new Date(),
          payload: {
            reservationsPulled: response.reservations.length,
            imported,
            duplicates,
            failed,
          },
        })
        await this.syncJobRepo.appendEvent(jobId, 'SYNC_COMPLETED', { status, imported, duplicates, failed })

        this.eventPublisher.publishSyncCompleted({
          syncJobId: jobId,
          organizationId,
          hotelId: dto.hotelId,
          providerId,
          syncType: 'RESERVATION_PULL',
          recordsProcessed: imported,
          recordsFailed: failed,
          durationMs: Date.now() - startedAt,
          correlationId,
        })
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during reservation sync'
      this.logger.error({ jobId, err, providerCode }, 'Reservation sync failed')

      await this.syncJobRepo.updateStatus(jobId, 'FAILED', {
        completedAt: new Date(),
        errorMessage,
      })
      await this.syncJobRepo.appendEvent(jobId, 'SYNC_FAILED', undefined, errorMessage)

      this.eventPublisher.publishSyncFailed({
        syncJobId: jobId,
        organizationId,
        hotelId: dto.hotelId,
        providerId,
        syncType: 'RESERVATION_PULL',
        errorMessage,
        retryCount: 0,
        correlationId,
      })
    }
  }
}
