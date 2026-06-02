import { UpdateHotel } from '../../application/use-cases/UpdateHotel'
import { Hotel } from '../../domain/entities/Hotel'
import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { HotelCache } from '../../application/services/HotelCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeHotel(orgId = 'org-1', deletedAt: Date | null = null): Hotel {
  return new Hotel({
    id: 'hotel-1',
    organizationId: orgId,
    name: 'Grand Palace Hotel',
    slug: 'grand-palace-hotel',
    address: null,
    city: 'Mumbai',
    state: null,
    country: 'IN',
    postalCode: null,
    phone: null,
    email: null,
    website: null,
    starRating: null,
    status: 'ACTIVE',
    timezone: 'UTC',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    metadata: null,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt,
  })
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makeHotelRepo(): jest.Mocked<IHotelRepository> {
  return {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findMany: jest.fn(),
  }
}

function makeCache(): jest.Mocked<HotelCache> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<HotelCache>
}

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  isConnected: () => false,
}

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UpdateHotel', () => {
  let hotelRepo: jest.Mocked<IHotelRepository>
  let cache: jest.Mocked<HotelCache>
  let useCase: UpdateHotel

  beforeEach(() => {
    jest.clearAllMocks()
    hotelRepo = makeHotelRepo()
    cache = makeCache()
    useCase = new UpdateHotel(hotelRepo, cache, mockPublisher, mockLogger)
  })

  it('updates hotel and invalidates cache', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())
    hotelRepo.update.mockResolvedValue(makeHotel())

    const result = await useCase.execute(
      'hotel-1',
      { name: 'New Name' },
      'user-1',
      'org-1',
      'corr-1'
    )

    expect(hotelRepo.update).toHaveBeenCalledWith('hotel-1', { name: 'New Name' })
    expect(cache.invalidate).toHaveBeenCalledWith('hotel-1')
    expect(result.id).toBe('hotel-1')
  })

  it('throws NotFoundError when hotel does not exist', async () => {
    hotelRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute('hotel-1', { name: 'X' }, 'user-1', 'org-1')
    ).rejects.toThrow(NotFoundError)

    expect(hotelRepo.update).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when hotel is soft-deleted', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel('org-1', new Date()))

    await expect(
      useCase.execute('hotel-1', { name: 'X' }, 'user-1', 'org-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when requester org does not match', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel('org-1'))

    await expect(
      useCase.execute('hotel-1', { name: 'X' }, 'user-1', 'org-999')
    ).rejects.toThrow(ForbiddenError)

    expect(hotelRepo.update).not.toHaveBeenCalled()
  })

  it('SUPER_ADMIN (null orgId) can update any hotel', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel('org-1'))
    hotelRepo.update.mockResolvedValue(makeHotel('org-1'))

    await expect(
      useCase.execute('hotel-1', { name: 'X' }, 'super-user', null)
    ).resolves.toBeDefined()
  })

  it('publishes hotel.updated event (fire-and-forget)', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())
    hotelRepo.update.mockResolvedValue(makeHotel())

    await useCase.execute('hotel-1', { name: 'X', city: 'Delhi' }, 'user-1', 'org-1', 'corr-pub')
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'hotel.events',
      expect.objectContaining({ eventType: 'hotel.updated', organizationId: 'org-1' })
    )
  })
})
