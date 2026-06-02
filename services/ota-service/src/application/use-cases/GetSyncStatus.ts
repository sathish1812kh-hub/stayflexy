import { BadRequestError } from '@stayflexi/shared-errors'
import type { ISyncJobRepository } from '../../domain/repositories/ISyncJobRepository'
import type { SyncJob } from '../../domain/entities/SyncJob'
import type { OtaSyncCache } from '../../infrastructure/cache/OtaSyncCache'
import type { Logger } from '@stayflexi/shared-logger'

export interface SyncStatusResult {
  hotelId: string
  jobs: SyncJob[]
  cached: unknown | null
}

export class GetSyncStatus {
  constructor(
    private readonly syncJobRepo: ISyncJobRepository,
    private readonly cache: OtaSyncCache,
    private readonly logger: Logger,
  ) {}

  async execute(
    hotelId: string,
    syncType?: string,
    limit = 20,
  ): Promise<SyncStatusResult> {
    if (!hotelId) {
      throw new BadRequestError('hotelId is required')
    }

    const [jobs, cachedStatus] = await Promise.all([
      this.syncJobRepo.findByHotel(hotelId, limit),
      syncType ? this.cache.getSyncStatus(hotelId, syncType) : Promise.resolve(null),
    ])

    const filteredJobs = syncType
      ? jobs.filter(j => j.syncType === syncType)
      : jobs

    this.logger.debug(
      { hotelId, syncType, jobCount: filteredJobs.length },
      'GetSyncStatus executed',
    )

    return {
      hotelId,
      jobs: filteredJobs,
      cached: cachedStatus,
    }
  }
}
