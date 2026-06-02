import { GetHotel } from '../../application/use-cases/GetHotel'
import { Hotel } from '../../domain/entities/Hotel'
import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { HotelCache } from '../../application/services/HotelCache'

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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GetHotel', () => {
  let hotelRepo: jest.Mocked<IHotelRepository>
  let cache: jest.Mocked<HotelCache>
  let useCase: GetHotel

  beforeEach(() => {
    jest.clearAllMocks()
    hotelRepo = makeHotelRepo()
    cache = makeCache()
    useCase = new GetHotel(hotelRepo, cache)
  })

  it('returns hotel from DB on cache miss and populates cache', async () => {
    cache.get.mockResolvedValue(null)
    hotelRepo.findById.mockResolvedValue(makeHotel())

    const result = await useCase.execute('hotel-1', 'org-1')

    expect(hotelRepo.findById).toHaveBeenCalledWith('hotel-1')
    expect(cache.set).toHaveBeenCalled()
    expect(result.id).toBe('hotel-1')
  })

  it('returns hotel from cache without hitting DB', async () => {
    cache.get.mockResolvedValue(makeHotel())

    const result = await useCase.execute('hotel-1', 'org-1')

    expect(hotelRepo.findById).not.toHaveBeenCalled()
    expect(result.id).toBe('hotel-1')
  })

  it('throws NotFoundError when hotel does not exist', async () => {
    cache.get.mockResolvedValue(null)
    hotelRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute('hotel-1', 'org-1')).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when hotel is soft-deleted', async () => {
    cache.get.mockResolvedValue(null)
    hotelRepo.findById.mockResolvedValue(makeHotel('org-1', new Date()))

    await expect(useCase.execute('hotel-1', 'org-1')).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when requester belongs to a different org', async () => {
    cache.get.mockResolvedValue(null)
    hotelRepo.findById.mockResolvedValue(makeHotel('org-1'))

    await expect(useCase.execute('hotel-1', 'org-999')).rejects.toThrow(ForbiddenError)
  })

  it('SUPER_ADMIN (null orgId) can access any hotel', async () => {
    cache.get.mockResolvedValue(null)
    hotelRepo.findById.mockResolvedValue(makeHotel('org-1'))

    await expect(useCase.execute('hotel-1', null)).resolves.toBeDefined()
  })

  it('throws ForbiddenError on cache hit when org does not match', async () => {
    cache.get.mockResolvedValue(makeHotel('org-1'))

    await expect(useCase.execute('hotel-1', 'org-999')).rejects.toThrow(ForbiddenError)
  })
})
