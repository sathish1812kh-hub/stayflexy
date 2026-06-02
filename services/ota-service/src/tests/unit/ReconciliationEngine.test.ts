import { ReconciliationEngine } from '../../reconciliation/ReconciliationEngine'
import { SyncJob } from '../../domain/entities/SyncJob'
import { OtaReservation } from '../../domain/entities/OtaReservation'
import { OtaMapping } from '../../domain/entities/OtaMapping'
import type { ISyncJobRepository } from '../../domain/repositories/ISyncJobRepository'
import type { IOtaReservationRepository } from '../../domain/repositories/IOtaReservationRepository'
import type { IOtaMappingRepository } from '../../domain/repositories/IOtaMappingRepository'
import type { OtaSyncCache } from '../../infrastructure/cache/OtaSyncCache'
import type { Logger } from '@stayflexi/shared-logger'

const makeSyncJob = (id: string, syncStatus: string, syncType = 'INVENTORY_PUSH'): SyncJob =>
  new SyncJob({
    id,
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    providerId: 'provider-1',
    syncType,
    syncStatus,
    idempotencyKey: `hotel-1:provider-1:${syncType}:${id}`,
    startedAt: null,
    completedAt: null,
    retryCount: 0,
    maxRetries: 3,
    errorMessage: syncStatus === 'FAILED' ? 'Connection timeout' : null,
    payload: null,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

const makeReservation = (
  id: string,
  syncStatus: 'PENDING' | 'IMPORTED' | 'FAILED' | 'DUPLICATE' | 'REJECTED',
  createdAt?: Date,
): OtaReservation =>
  new OtaReservation({
    id,
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    providerId: 'provider-1',
    externalReservationId: `EXT-${id}`,
    bookingId: syncStatus === 'IMPORTED' ? 'bk-1' : null,
    syncStatus,
    rawPayload: {},
    importedAt: syncStatus === 'IMPORTED' ? new Date() : null,
    errorMessage: syncStatus === 'FAILED' ? 'Import error' : null,
    createdAt: createdAt ?? new Date(),
    updatedAt: new Date(),
  })

const makeMapping = (id: string, isActive: boolean): OtaMapping =>
  new OtaMapping({
    id,
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    roomTypeId: null,
    providerId: 'provider-1',
    externalHotelId: 'ext-1',
    externalRoomTypeId: null,
    syncStatus: 'SUCCESS',
    isActive,
    lastSyncedAt: new Date(),
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

const mockSyncJobRepo: jest.Mocked<ISyncJobRepository> = {
  findById: jest.fn(),
  findByIdempotencyKey: jest.fn(),
  findByHotel: jest.fn(),
  findPendingRetries: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
  appendEvent: jest.fn(),
  incrementRetry: jest.fn(),
}

const mockReservationRepo: jest.Mocked<IOtaReservationRepository> = {
  findById: jest.fn(),
  findByExternalId: jest.fn(),
  findByHotel: jest.fn(),
  findPendingForHotel: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
}

const mockMappingRepo: jest.Mocked<IOtaMappingRepository> = {
  findById: jest.fn(),
  findByHotelAndProvider: jest.fn(),
  findByOrganization: jest.fn(),
  findActiveForHotel: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deactivate: jest.fn(),
  updateSyncStatus: jest.fn(),
}

const mockCache: jest.Mocked<OtaSyncCache> = {
  getSyncJob: jest.fn(),
  setSyncJob: jest.fn(),
  invalidateSyncJob: jest.fn(),
  checkReservationDedup: jest.fn(),
  markReservationProcessed: jest.fn(),
  getIdempotencyResult: jest.fn(),
  setIdempotencyResult: jest.fn(),
  getSyncStatus: jest.fn(),
  setSyncStatus: jest.fn().mockResolvedValue(undefined),
} as unknown as jest.Mocked<OtaSyncCache>

const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

describe('ReconciliationEngine', () => {
  let engine: ReconciliationEngine

  beforeEach(() => {
    jest.clearAllMocks()
    mockMappingRepo.findByOrganization.mockResolvedValue([makeMapping('map-1', true)])
    engine = new ReconciliationEngine(
      mockSyncJobRepo,
      mockReservationRepo,
      mockMappingRepo,
      mockCache,
      mockLogger,
    )
  })

  it('returns CLEAN report when all jobs succeeded and reservations are imported', async () => {
    mockSyncJobRepo.findByHotel.mockResolvedValue([makeSyncJob('job-1', 'SUCCESS')])
    mockReservationRepo.findByHotel.mockResolvedValue({
      data: [makeReservation('res-1', 'IMPORTED')],
      total: 1,
    })

    const report = await engine.generateReport('hotel-1', 'org-1', '2026-05-01', '2026-05-31')

    expect(report.status).toBe('CLEAN')
    expect(report.discrepancies).toHaveLength(0)
    expect(report.syncJobs.succeeded).toBe(1)
    expect(report.reservations.imported).toBe(1)
  })

  it('flags DISCREPANCIES_FOUND with HIGH severity when sync jobs have FAILED', async () => {
    mockSyncJobRepo.findByHotel.mockResolvedValue([
      makeSyncJob('job-1', 'SUCCESS'),
      makeSyncJob('job-2', 'FAILED'),
    ])
    mockReservationRepo.findByHotel.mockResolvedValue({ data: [], total: 0 })

    const report = await engine.generateReport('hotel-1', 'org-1', '2026-05-01', '2026-05-31')

    expect(report.status).toBe('DISCREPANCIES_FOUND')
    const failureDiscrepancy = report.discrepancies.find(d => d.type === 'SYNC_JOB_FAILURE')
    expect(failureDiscrepancy).toBeDefined()
    expect(failureDiscrepancy?.severity).toBe('HIGH')
    expect(failureDiscrepancy?.affectedId).toBe('job-2')
  })

  it('flags MEDIUM severity for stale pending reservations older than 1 hour', async () => {
    const staleDate = new Date(Date.now() - 2 * 3600000) // 2 hours ago
    mockSyncJobRepo.findByHotel.mockResolvedValue([])
    mockReservationRepo.findByHotel.mockResolvedValue({
      data: [makeReservation('res-stale', 'PENDING', staleDate)],
      total: 1,
    })

    const report = await engine.generateReport('hotel-1', 'org-1', '2026-05-01', '2026-05-31')

    const staleDiscrepancy = report.discrepancies.find(d => d.type === 'RESERVATION_IMPORT_FAILURE')
    expect(staleDiscrepancy).toBeDefined()
    expect(staleDiscrepancy?.severity).toBe('MEDIUM')
    expect(staleDiscrepancy?.affectedId).toBe('res-stale')
  })

  it('flags inactive mappings as LOW severity discrepancies', async () => {
    mockSyncJobRepo.findByHotel.mockResolvedValue([])
    mockReservationRepo.findByHotel.mockResolvedValue({ data: [], total: 0 })
    mockMappingRepo.findByOrganization.mockResolvedValue([
      makeMapping('map-active', true),
      makeMapping('map-inactive', false),
    ])

    const report = await engine.generateReport('hotel-1', 'org-1', '2026-05-01', '2026-05-31')

    const inactiveDiscrepancy = report.discrepancies.find(d => d.type === 'MAPPING_INACTIVE')
    expect(inactiveDiscrepancy).toBeDefined()
    expect(inactiveDiscrepancy?.severity).toBe('LOW')
    expect(inactiveDiscrepancy?.affectedId).toBe('map-inactive')
    // Clean because no HIGH severity issues
    expect(report.status).toBe('CLEAN')
  })

  it('correctly aggregates sync stats with mixed statuses', async () => {
    mockSyncJobRepo.findByHotel.mockResolvedValue([
      makeSyncJob('j1', 'SUCCESS'),
      makeSyncJob('j2', 'SUCCESS'),
      makeSyncJob('j3', 'FAILED'),
      makeSyncJob('j4', 'RETRYING'),
      makeSyncJob('j5', 'RUNNING'),
    ])
    mockReservationRepo.findByHotel.mockResolvedValue({
      data: [
        makeReservation('r1', 'IMPORTED'),
        makeReservation('r2', 'IMPORTED'),
        makeReservation('r3', 'PENDING'),
        makeReservation('r4', 'DUPLICATE'),
      ],
      total: 4,
    })

    const report = await engine.generateReport('hotel-1', 'org-1', '2026-05-01', '2026-05-31')

    expect(report.syncJobs.total).toBe(5)
    expect(report.syncJobs.succeeded).toBe(2)
    expect(report.syncJobs.failed).toBe(1)
    expect(report.syncJobs.retrying).toBe(1)
    expect(report.reservations.imported).toBe(2)
    expect(report.reservations.pending).toBe(1)
    expect(report.reservations.duplicates).toBe(1)
    expect(report.generatedAt).toBeDefined()
  })
})
