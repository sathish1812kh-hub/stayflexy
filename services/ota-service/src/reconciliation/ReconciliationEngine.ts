import type { ISyncJobRepository } from '../domain/repositories/ISyncJobRepository'
import type { IOtaReservationRepository } from '../domain/repositories/IOtaReservationRepository'
import type { IOtaMappingRepository } from '../domain/repositories/IOtaMappingRepository'
import type { OtaSyncCache } from '../infrastructure/cache/OtaSyncCache'
import type { Logger } from '@stayflexi/shared-logger'

export interface ReconciliationDiscrepancy {
  type: 'RESERVATION_IMPORT_FAILURE' | 'SYNC_JOB_FAILURE' | 'MAPPING_INACTIVE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
  affectedId?: string
}

export interface ReconciliationReport {
  hotelId: string
  organizationId: string
  generatedAt: string
  period: { from: string; to: string }
  syncJobs: {
    total: number
    succeeded: number
    failed: number
    retrying: number
  }
  reservations: {
    total: number
    imported: number
    pending: number
    failed: number
    duplicates: number
  }
  discrepancies: ReconciliationDiscrepancy[]
  status: 'CLEAN' | 'DISCREPANCIES_FOUND'
}

// Threshold: reservations pending for more than 1 hour are considered stale
const STALE_RESERVATION_THRESHOLD_MS = 3600000

export class ReconciliationEngine {
  constructor(
    private readonly syncJobRepo: ISyncJobRepository,
    private readonly reservationRepo: IOtaReservationRepository,
    private readonly mappingRepo: IOtaMappingRepository,
    private readonly cache: OtaSyncCache,
    private readonly logger: Logger,
  ) {}

  async generateReport(
    hotelId: string,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<ReconciliationReport> {
    this.logger.info({ hotelId, organizationId, dateFrom, dateTo }, 'Starting OTA reconciliation')

    const [syncJobs, reservationsResult, mappings] = await Promise.all([
      this.syncJobRepo.findByHotel(hotelId, 1000),
      this.reservationRepo.findByHotel(hotelId, { limit: 1000 }),
      this.mappingRepo.findByOrganization(organizationId, hotelId),
    ])

    const reservations = reservationsResult.data

    const syncStats = {
      total: syncJobs.length,
      succeeded: syncJobs.filter(j => j.syncStatus === 'SUCCESS').length,
      failed: syncJobs.filter(j => j.syncStatus === 'FAILED').length,
      retrying: syncJobs.filter(j => j.syncStatus === 'RETRYING').length,
    }

    const reservationStats = {
      total: reservations.length,
      imported: reservations.filter(r => r.syncStatus === 'IMPORTED').length,
      pending: reservations.filter(r => r.syncStatus === 'PENDING').length,
      failed: reservations.filter(r => r.syncStatus === 'FAILED').length,
      duplicates: reservations.filter(r => r.syncStatus === 'DUPLICATE').length,
    }

    const discrepancies: ReconciliationDiscrepancy[] = []

    // Check for failed sync jobs
    for (const job of syncJobs.filter(j => j.syncStatus === 'FAILED')) {
      discrepancies.push({
        type: 'SYNC_JOB_FAILURE',
        severity: 'HIGH',
        description: `Sync job ${job.id} (${job.syncType}) failed: ${job.errorMessage ?? 'Unknown error'}`,
        affectedId: job.id,
      })
    }

    // Check for stale pending reservations (older than 1 hour)
    const staleThreshold = Date.now() - STALE_RESERVATION_THRESHOLD_MS
    for (const res of reservations.filter(
      r => r.syncStatus === 'PENDING' && r.createdAt.getTime() < staleThreshold,
    )) {
      discrepancies.push({
        type: 'RESERVATION_IMPORT_FAILURE',
        severity: 'MEDIUM',
        description: `OTA reservation ${res.externalReservationId} (id: ${res.id}) has been pending for over 1 hour`,
        affectedId: res.id,
      })
    }

    // Check for failed reservations
    for (const res of reservations.filter(r => r.syncStatus === 'FAILED')) {
      discrepancies.push({
        type: 'RESERVATION_IMPORT_FAILURE',
        severity: 'HIGH',
        description: `OTA reservation ${res.externalReservationId} failed to import: ${res.errorMessage ?? 'Unknown error'}`,
        affectedId: res.id,
      })
    }

    // Check for inactive mappings
    for (const mapping of mappings.filter(m => !m.isActive)) {
      discrepancies.push({
        type: 'MAPPING_INACTIVE',
        severity: 'LOW',
        description: `OTA mapping ${mapping.id} (hotel: ${mapping.hotelId}, provider: ${mapping.providerId}) is inactive`,
        affectedId: mapping.id,
      })
    }

    const hasHighSeverity = discrepancies.some(d => d.severity === 'HIGH')
    const status: ReconciliationReport['status'] = hasHighSeverity ? 'DISCREPANCIES_FOUND' : 'CLEAN'

    const report: ReconciliationReport = {
      hotelId,
      organizationId,
      generatedAt: new Date().toISOString(),
      period: { from: dateFrom, to: dateTo },
      syncJobs: syncStats,
      reservations: reservationStats,
      discrepancies,
      status,
    }

    this.logger.info(
      { hotelId, discrepancyCount: discrepancies.length, status },
      'OTA reconciliation complete',
    )

    // Cache the result briefly
    await this.cache.setSyncStatus(hotelId, 'RECONCILIATION', {
      status,
      generatedAt: report.generatedAt,
      discrepancyCount: discrepancies.length,
    })

    return report
  }
}
