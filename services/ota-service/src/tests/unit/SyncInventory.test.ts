import { SyncInventory } from '../../application/use-cases/SyncInventory'
import { OtaProvider } from '../../domain/entities/OtaProvider'
import { OtaMapping } from '../../domain/entities/OtaMapping'
import { SyncJob } from '../../domain/entities/SyncJob'
import { NotFoundError, ConflictError } from '@stayflexi/shared-errors'
import type { IOtaProviderRepository } from '../../domain/repositories/IOtaProviderRepository'
import type { IOtaMappingRepository } from '../../domain/repositories/IOtaMappingRepository'
import type { ISyncJobRepository } from '../../domain/repositories/ISyncJobRepository'
import type { OtaSyncCache } from '../../infrastructure/cache/OtaSyncCache'
import type { OtaDistributedLock } from '../../infrastructure/locking/OtaDistributedLock'
import type { OtaEventPublisher } from '../../infrastructure/events/OtaEventPublisher'
import type { AdapterFactory } from '../../adapters/AdapterFactory'
import type { Logger } from '@stayflexi/shared-logger'
import type { SyncInventoryDto } from '../../application/dtos/ota.dto'

const makeProvider = (overrides?: Partial<{ status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' }>): OtaProvider =>
  new OtaProvider({
    id: 'provider-1',
    providerCode: 'BOOKING_COM',
    providerName: 'Booking.com',
    status: overrides?.status ?? 'ACTIVE',
    description: null,
    webhookUrl: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

const makeMapping = (overrides?: Partial<{ isActive: boolean; organizationId: string }>): OtaMapping =>
  new OtaMapping({
    id: 'mapping-1',
    organizationId: overrides?.organizationId ?? 'org-1',
    hotelId: 'hotel-1',
    roomTypeId: null,
    providerId: 'provider-1',
    externalHotelId: 'ext-hotel-1',
    externalRoomTypeId: null,
    syncStatus: 'PENDING',
    isActive: overrides?.isActive ?? true,
    lastSyncedAt: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

const makeSyncJob = (overrides?: Partial<{ syncStatus: string }>): SyncJob =>
  new SyncJob({
    id: 'job-1',
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    providerId: 'provider-1',
    syncType: 'INVENTORY_PUSH',
    syncStatus: overrides?.syncStatus ?? 'PENDING',
    idempotencyKey: 'hotel-1:provider-1:INVENTORY_PUSH:2026-06-01:2026-06-30',
    startedAt: null,
    completedAt: null,
    retryCount: 0,
    maxRetries: 3,
    errorMessage: null,
    payload: null,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

const mockProviderRepo: jest.Mocked<IOtaProviderRepository> = {
  findById: jest.fn(),
  findByCode: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
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

const mockCache: jest.Mocked<OtaSyncCache> = {
  getSyncJob: jest.fn(),
  setSyncJob: jest.fn(),
  invalidateSyncJob: jest.fn(),
  checkReservationDedup: jest.fn(),
  markReservationProcessed: jest.fn(),
  getIdempotencyResult: jest.fn(),
  setIdempotencyResult: jest.fn(),
  getSyncStatus: jest.fn(),
  setSyncStatus: jest.fn(),
} as unknown as jest.Mocked<OtaSyncCache>

const mockLock: jest.Mocked<OtaDistributedLock> = {
  acquire: jest.fn(),
  release: jest.fn(),
  withLock: jest.fn().mockImplementation(async (_r: unknown, fn: () => Promise<unknown>) => fn()),
  isLocked: jest.fn(),
} as unknown as jest.Mocked<OtaDistributedLock>

const mockEventPublisher = {
  publishSyncStarted: jest.fn(),
  publishSyncCompleted: jest.fn(),
  publishSyncFailed: jest.fn(),
  publishReservationImported: jest.fn(),
  publishConnectionCreated: jest.fn(),
} as unknown as jest.Mocked<OtaEventPublisher>

const mockAdapter = {
  providerCode: 'BOOKING_COM',
  pushInventory: jest.fn().mockResolvedValue({ success: true, recordsProcessed: 5, recordsFailed: 0, errors: [] }),
  pushRates: jest.fn(),
  pullReservations: jest.fn(),
  validateCredentials: jest.fn(),
  normalizeWebhookPayload: jest.fn(),
}

const mockAdapterFactory: jest.Mocked<AdapterFactory> = {
  getAdapter: jest.fn().mockReturnValue(mockAdapter),
  getSupportedProviders: jest.fn(),
  hasAdapter: jest.fn(),
} as unknown as jest.Mocked<AdapterFactory>

const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

const validDto: SyncInventoryDto = {
  hotelId: 'hotel-1',
  providerId: 'provider-1',
  dateFrom: '2026-06-01',
  dateTo: '2026-06-30',
  roomAvailability: [
    { externalRoomTypeId: 'room-ext-1', date: '2026-06-01', available: 5, totalRooms: 10 },
  ],
}

describe('SyncInventory', () => {
  let useCase: SyncInventory

  beforeEach(() => {
    jest.clearAllMocks()
    mockProviderRepo.findById.mockResolvedValue(makeProvider())
    mockMappingRepo.findByHotelAndProvider.mockResolvedValue([makeMapping()])
    mockSyncJobRepo.findByIdempotencyKey.mockResolvedValue(null)
    mockSyncJobRepo.create.mockResolvedValue(makeSyncJob())
    mockSyncJobRepo.findById.mockResolvedValue(null)
    mockSyncJobRepo.updateStatus.mockResolvedValue(makeSyncJob({ syncStatus: 'RUNNING' }))
    mockSyncJobRepo.appendEvent.mockResolvedValue(undefined)
    mockCache.getIdempotencyResult.mockResolvedValue(null)
    mockCache.setIdempotencyResult.mockResolvedValue(undefined)
    mockCache.setSyncStatus.mockResolvedValue(undefined)
    mockMappingRepo.updateSyncStatus.mockResolvedValue(makeMapping())

    useCase = new SyncInventory(
      mockProviderRepo,
      mockMappingRepo,
      mockSyncJobRepo,
      mockCache,
      mockLock,
      mockEventPublisher,
      mockAdapterFactory,
      mockLogger,
    )
  })

  it('creates a sync job successfully for active provider and mapping', async () => {
    const result = await useCase.execute(validDto, 'org-1', 'user-1', 'corr-1')
    expect(result).toBeInstanceOf(SyncJob)
    expect(mockSyncJobRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        syncType: 'INVENTORY_PUSH',
        hotelId: 'hotel-1',
        providerId: 'provider-1',
        organizationId: 'org-1',
      }),
    )
    expect(mockCache.setIdempotencyResult).toHaveBeenCalled()
    expect(mockEventPublisher.publishSyncStarted).toHaveBeenCalledWith(
      expect.objectContaining({ syncJobId: 'job-1', syncType: 'INVENTORY_PUSH' }),
    )
  })

  it('returns existing non-completed job when idempotency key matches (Redis cache hit)', async () => {
    const pendingJob = makeSyncJob({ syncStatus: 'PENDING' })
    mockCache.getIdempotencyResult.mockResolvedValue('job-1')
    mockSyncJobRepo.findById.mockResolvedValue(pendingJob)

    const result = await useCase.execute(validDto, 'org-1', 'user-1')
    expect(result.id).toBe('job-1')
    expect(mockSyncJobRepo.create).not.toHaveBeenCalled()
  })

  it('returns existing non-completed job when idempotency key matches (DB lookup)', async () => {
    const runningJob = makeSyncJob({ syncStatus: 'RUNNING' })
    mockCache.getIdempotencyResult.mockResolvedValue(null)
    mockSyncJobRepo.findByIdempotencyKey.mockResolvedValue(runningJob)

    const result = await useCase.execute(validDto, 'org-1', 'user-1')
    expect(result.id).toBe('job-1')
    expect(mockSyncJobRepo.create).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when OTA provider does not exist', async () => {
    mockProviderRepo.findById.mockResolvedValue(null)
    await expect(useCase.execute(validDto, 'org-1', 'user-1')).rejects.toThrow(NotFoundError)
  })

  it('throws ConflictError when OTA provider is inactive', async () => {
    mockProviderRepo.findById.mockResolvedValue(makeProvider({ status: 'INACTIVE' }))
    await expect(useCase.execute(validDto, 'org-1', 'user-1')).rejects.toThrow(ConflictError)
  })

  it('throws NotFoundError when no active mapping exists for hotel/provider', async () => {
    mockMappingRepo.findByHotelAndProvider.mockResolvedValue([makeMapping({ isActive: false })])
    await expect(useCase.execute(validDto, 'org-1', 'user-1')).rejects.toThrow(NotFoundError)
  })

  it('throws ConflictError when mapping belongs to different organization', async () => {
    mockMappingRepo.findByHotelAndProvider.mockResolvedValue([makeMapping({ organizationId: 'other-org' })])
    await expect(useCase.execute(validDto, 'org-1', 'user-1')).rejects.toThrow(ConflictError)
  })

  it('creates new job when previous completed job exists (allows re-sync)', async () => {
    const completedJob = makeSyncJob({ syncStatus: 'SUCCESS' })
    mockSyncJobRepo.findByIdempotencyKey.mockResolvedValue(completedJob)

    const result = await useCase.execute(validDto, 'org-1', 'user-1')
    expect(result).toBeInstanceOf(SyncJob)
    expect(mockSyncJobRepo.create).toHaveBeenCalled()
  })
})
