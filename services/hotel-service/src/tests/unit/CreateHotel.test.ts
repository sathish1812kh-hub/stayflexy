import { CreateHotel } from '../../application/use-cases/CreateHotel'
import { Hotel } from '../../domain/entities/Hotel'
import { ConflictError } from '@stayflexi/shared-errors'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeHotel(overrides: Partial<{ slug: string; id: string }> = {}): Hotel {
  return new Hotel({
    id: overrides.id ?? 'hotel-1',
    organizationId: 'org-1',
    name: 'Grand Palace Hotel',
    slug: overrides.slug ?? 'grand-palace-hotel',
    address: null,
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'IN',
    postalCode: null,
    phone: null,
    email: null,
    website: null,
    starRating: null,
    status: 'ACTIVE',
    timezone: 'Asia/Kolkata',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    metadata: null,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
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

describe('CreateHotel', () => {
  let hotelRepo: jest.Mocked<IHotelRepository>
  let useCase: CreateHotel

  beforeEach(() => {
    jest.clearAllMocks()
    hotelRepo = makeHotelRepo()
    useCase = new CreateHotel(hotelRepo, mockPublisher, mockLogger)
  })

  it('creates a hotel and returns the entity', async () => {
    hotelRepo.findBySlug.mockResolvedValue(null)
    hotelRepo.create.mockResolvedValue(makeHotel())

    const result = await useCase.execute(
      { name: 'Grand Palace Hotel', city: 'Mumbai', country: 'IN' },
      'org-1',
      'user-1',
      'corr-1'
    )

    expect(hotelRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        name: 'Grand Palace Hotel',
        slug: 'grand-palace-hotel',
        createdById: 'user-1',
      })
    )
    expect(result.id).toBe('hotel-1')
  })

  it('uses explicitly provided slug', async () => {
    hotelRepo.findBySlug.mockResolvedValue(null)
    hotelRepo.create.mockResolvedValue(makeHotel({ slug: 'my-palace' }))

    await useCase.execute(
      { name: 'Grand Palace Hotel', slug: 'my-palace', city: 'Mumbai', country: 'IN' },
      'org-1',
      'user-1'
    )

    expect(hotelRepo.findBySlug).toHaveBeenCalledWith('my-palace')
    expect(hotelRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'my-palace' })
    )
  })

  it('generates slug from name when not provided', async () => {
    hotelRepo.findBySlug.mockResolvedValue(null)
    hotelRepo.create.mockResolvedValue(makeHotel())

    await useCase.execute(
      { name: 'Grand Palace Hotel!!', city: 'Mumbai', country: 'IN' },
      'org-1',
      'user-1'
    )

    expect(hotelRepo.findBySlug).toHaveBeenCalledWith('grand-palace-hotel')
  })

  it('throws ConflictError when slug is already taken', async () => {
    hotelRepo.findBySlug.mockResolvedValue(makeHotel())

    await expect(
      useCase.execute(
        { name: 'Grand Palace Hotel', city: 'Mumbai', country: 'IN' },
        'org-1',
        'user-1'
      )
    ).rejects.toThrow(ConflictError)

    expect(hotelRepo.create).not.toHaveBeenCalled()
  })

  it('publishes hotel.created event (fire-and-forget)', async () => {
    hotelRepo.findBySlug.mockResolvedValue(null)
    hotelRepo.create.mockResolvedValue(makeHotel())

    await useCase.execute(
      { name: 'Grand Palace Hotel', city: 'Mumbai', country: 'IN' },
      'org-1',
      'user-1',
      'corr-abc'
    )
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'hotel.events',
      expect.objectContaining({ eventType: 'hotel.created', organizationId: 'org-1' })
    )
  })

  it('does not throw when event publisher fails', async () => {
    ;(mockPublisher.publish as jest.Mock).mockRejectedValueOnce(new Error('Kafka down'))
    hotelRepo.findBySlug.mockResolvedValue(null)
    hotelRepo.create.mockResolvedValue(makeHotel())

    await expect(
      useCase.execute(
        { name: 'Grand Palace Hotel', city: 'Mumbai', country: 'IN' },
        'org-1',
        'user-1'
      )
    ).resolves.toBeDefined()
  })
})
