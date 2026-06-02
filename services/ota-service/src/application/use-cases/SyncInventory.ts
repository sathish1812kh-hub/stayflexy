import { NotFoundError, ConflictError } from '@stayflexi/shared-errors'
import type { IOtaProviderRepository } from '../../domain/repositories/IOtaProviderRepository'
import type { IOtaMappingRepository } from '../../domain/repositories/IOtaMappingRepository'
import type { ISyncJobRepository } from '../../domain/repositories/ISyncJobRepository'
import type { SyncJob } from '../../domain/entities/SyncJob'
import type { OtaSyncCache } from '../../infrastructure/cache/OtaSyncCache'
import type { OtaDistributedLock } from '../../infrastructure/locking/OtaDistributedLock'
import type { OtaEventPublisher } from '../../infrastructure/events/OtaEventPublisher'
import type { AdapterFactory } from '../../adapters/AdapterFactory'
import type { SyncInventoryDto } from '../dtos/ota.dto'
import type { Logger } from '@stayflexi/shared-logger'

export class SyncInventory {
  constructor(
    private readonly providerRepo: IOtaProviderRepository,
    private readonly mappingRepo: IOtaMappingRepository,
    private readonly syncJobRepo: ISyncJobRepository,
    private readonly cache: OtaSyncCache,
    private readonly lock: OtaDistributedLock,
    private readonly eventPublisher: OtaEventPublisher,
    private readonly adapterFactory: AdapterFactory,
    private readonly logger: Logger,
  ) {}

  async execute(
    dto: SyncInventoryDto,
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

    const idempotencyKey = `${dto.hotelId}:${dto.providerId}:INVENTORY_PUSH:${dto.dateFrom}:${dto.dateTo}`

    // Check Redis idempotency cache first
    const cachedJobId = await this.cache.getIdempotencyResult(idempotencyKey)
    if (cachedJobId) {
      const cachedJob = await this.syncJobRepo.findById(cachedJobId)
      if (cachedJob && !cachedJob.isCompleted()) return cachedJob
    }

    // Check DB idempotency
    const existingJob = await this.syncJobRepo.findByIdempotencyKey(idempotencyKey)
    if (existingJob && !existingJob.isCompleted()) return existingJob

    // Create new sync job
    const job = await this.syncJobRepo.create({
      organizationId,
      hotelId: dto.hotelId,
      providerId: dto.providerId,
      syncType: 'INVENTORY_PUSH',
      idempotencyKey,
      payload: {
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
        roomCount: dto.roomAvailability.length,
      },
      createdById: userId,
      maxRetries: 3,
    })

    await this.cache.setIdempotencyResult(idempotencyKey, job.id)
    await this.syncJobRepo.appendEvent(job.id, 'SYNC_STARTED', { syncType: 'INVENTORY_PUSH' })

    this.eventPublisher.publishSyncStarted({
      syncJobId: job.id,
      organizationId,
      hotelId: dto.hotelId,
      providerId: dto.providerId,
      syncType: 'INVENTORY_PUSH',
      correlationId,
    })

    // Execute asynchronously
    setImmediate(() => {
      void this.executeInventorySync(
        job.id,
        activeMapping.id,
        activeMapping.externalHotelId,
        dto,
        organizationId,
        provider.providerCode,
        correlationId,
      )
    })

    return job
  }

  private async executeInventorySync(
    jobId: string,
    mappingId: string,
    externalHotelId: string,
    dto: SyncInventoryDto,
    organizationId: string,
    providerCode: string,
    correlationId?: string,
  ): Promise<void> {
    const lockResource = `inventory:${dto.hotelId}:${dto.providerId}`
    const startedAt = Date.now()

    try {
      await this.lock.withLock(lockResource, async () => {
        await this.syncJobRepo.updateStatus(jobId, 'RUNNING', { startedAt: new Date() })

        const adapter = this.adapterFactory.getAdapter(providerCode)
        const response = await adapter.pushInventory({
          hotelId: dto.hotelId,
          externalHotelId,
          organizationId,
          rooms: dto.roomAvailability,
          dateFrom: dto.dateFrom,
          dateTo: dto.dateTo,
          correlationId,
        })

        const status = response.recordsFailed === 0 || response.recordsProcessed > 0 ? 'SUCCESS' : 'FAILED'

        await this.syncJobRepo.updateStatus(jobId, status, {
          completedAt: new Date(),
          payload: {
            recordsProcessed: response.recordsProcessed,
            recordsFailed: response.recordsFailed,
            errors: response.errors,
          },
        })

        await this.syncJobRepo.appendEvent(jobId, 'INVENTORY_UPDATED', {
          recordsProcessed: response.recordsProcessed,
          recordsFailed: response.recordsFailed,
        })
        await this.syncJobRepo.appendEvent(jobId, 'SYNC_COMPLETED', { status })

        await this.cache.setSyncStatus(dto.hotelId, 'INVENTORY_PUSH', {
          status,
          completedAt: new Date().toISOString(),
          recordsProcessed: response.recordsProcessed,
        })

        await this.mappingRepo.updateSyncStatus(mappingId, status)

        this.eventPublisher.publishSyncCompleted({
          syncJobId: jobId,
          organizationId,
          hotelId: dto.hotelId,
          providerId: dto.providerId,
          syncType: 'INVENTORY_PUSH',
          recordsProcessed: response.recordsProcessed,
          recordsFailed: response.recordsFailed,
          durationMs: Date.now() - startedAt,
          correlationId,
        })
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during inventory sync'
      this.logger.error({ jobId, err, providerCode }, 'Inventory sync failed')

      await this.syncJobRepo.updateStatus(jobId, 'FAILED', {
        completedAt: new Date(),
        errorMessage,
      })
      await this.syncJobRepo.appendEvent(jobId, 'SYNC_FAILED', undefined, errorMessage)

      this.eventPublisher.publishSyncFailed({
        syncJobId: jobId,
        organizationId,
        hotelId: dto.hotelId,
        providerId: dto.providerId,
        syncType: 'INVENTORY_PUSH',
        errorMessage,
        retryCount: 0,
        correlationId,
      })
    }
  }
}
