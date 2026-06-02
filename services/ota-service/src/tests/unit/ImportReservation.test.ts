import { ImportReservation } from '../../application/use-cases/ImportReservation'
import { OtaReservation } from '../../domain/entities/OtaReservation'
import { NotFoundError, ConflictError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IOtaReservationRepository } from '../../domain/repositories/IOtaReservationRepository'
import type { OtaEventPublisher } from '../../infrastructure/events/OtaEventPublisher'
import type { Logger } from '@stayflexi/shared-logger'

const makeReservation = (overrides?: Partial<{
  syncStatus: 'PENDING' | 'IMPORTED' | 'FAILED' | 'DUPLICATE' | 'REJECTED'
  organizationId: string
  bookingId: string | null
}>): OtaReservation =>
  new OtaReservation({
    id: 'res-1',
    organizationId: overrides?.organizationId ?? 'org-1',
    hotelId: 'hotel-1',
    providerId: 'provider-1',
    externalReservationId: 'EXT-RES-001',
    bookingId: overrides?.bookingId ?? null,
    syncStatus: overrides?.syncStatus ?? 'PENDING',
    rawPayload: { guest: 'John Doe', room: '101' },
    importedAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

const mockReservationRepo: jest.Mocked<IOtaReservationRepository> = {
  findById: jest.fn(),
  findByExternalId: jest.fn(),
  findByHotel: jest.fn(),
  findPendingForHotel: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
}

const mockEventPublisher = {
  publishSyncStarted: jest.fn(),
  publishSyncCompleted: jest.fn(),
  publishSyncFailed: jest.fn(),
  publishReservationImported: jest.fn(),
  publishConnectionCreated: jest.fn(),
} as unknown as jest.Mocked<OtaEventPublisher>

const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

describe('ImportReservation', () => {
  let useCase: ImportReservation

  beforeEach(() => {
    jest.clearAllMocks()
    mockReservationRepo.findById.mockResolvedValue(makeReservation())
    mockReservationRepo.updateStatus.mockResolvedValue(
      makeReservation({ syncStatus: 'IMPORTED', bookingId: 'booking-123' }),
    )
    useCase = new ImportReservation(mockReservationRepo, mockEventPublisher, mockLogger)
  })

  it('marks a pending reservation as imported', async () => {
    const result = await useCase.execute('res-1', 'booking-123', {
      organizationId: 'org-1',
      userId: 'user-1',
      correlationId: 'corr-1',
    })
    expect(result.syncStatus).toBe('IMPORTED')
    expect(mockReservationRepo.updateStatus).toHaveBeenCalledWith(
      'res-1',
      'IMPORTED',
      expect.objectContaining({ bookingId: 'booking-123' }),
    )
    expect(mockEventPublisher.publishReservationImported).toHaveBeenCalled()
  })

  it('throws NotFoundError when reservation does not exist', async () => {
    mockReservationRepo.findById.mockResolvedValue(null)
    await expect(
      useCase.execute('res-nonexistent', undefined, { organizationId: 'org-1', userId: 'user-1' }),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when reservation belongs to a different organization', async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation({ organizationId: 'other-org' }))
    await expect(
      useCase.execute('res-1', undefined, { organizationId: 'org-1', userId: 'user-1' }),
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ConflictError when reservation is already imported', async () => {
    mockReservationRepo.findById.mockResolvedValue(
      makeReservation({ syncStatus: 'IMPORTED', bookingId: 'bk-existing' }),
    )
    await expect(
      useCase.execute('res-1', undefined, { organizationId: 'org-1', userId: 'user-1' }),
    ).rejects.toThrow(ConflictError)
  })

  it('throws ConflictError when reservation is marked as duplicate', async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation({ syncStatus: 'DUPLICATE' }))
    await expect(
      useCase.execute('res-1', undefined, { organizationId: 'org-1', userId: 'user-1' }),
    ).rejects.toThrow(ConflictError)
  })

  it('publishes reservation imported event after successful import', async () => {
    await useCase.execute('res-1', 'bk-999', {
      organizationId: 'org-1',
      userId: 'user-1',
      correlationId: 'corr-abc',
    })
    expect(mockEventPublisher.publishReservationImported).toHaveBeenCalledWith(
      expect.objectContaining({
        otaReservationId: 'res-1',
        organizationId: 'org-1',
        correlationId: 'corr-abc',
      }),
    )
  })

  it('imports reservation without bookingId when not provided', async () => {
    await useCase.execute('res-1', undefined, { organizationId: 'org-1', userId: 'user-1' })
    expect(mockReservationRepo.updateStatus).toHaveBeenCalledWith(
      'res-1',
      'IMPORTED',
      expect.objectContaining({ bookingId: undefined }),
    )
  })
})
