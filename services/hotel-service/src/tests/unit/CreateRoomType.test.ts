import { CreateRoomType } from '../../application/use-cases/CreateRoomType'
import { Hotel } from '../../domain/entities/Hotel'
import { RoomType } from '../../domain/entities/RoomType'
import { NotFoundError, ForbiddenError, ConflictError } from '@stayflexi/shared-errors'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { IRoomTypeRepository } from '../../domain/repositories/IRoomTypeRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeHotel(status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE', deletedAt: Date | null = null): Hotel {
  return new Hotel({
    id: 'hotel-1',
    organizationId: 'org-1',
    name: 'Grand Palace',
    slug: 'grand-palace',
    address: null, city: 'Mumbai', state: null, country: 'IN', postalCode: null,
    phone: null, email: null, website: null, starRating: null,
    status,
    timezone: 'UTC', checkInTime: '14:00', checkOutTime: '11:00',
    metadata: null, createdById: null, createdAt: new Date(), updatedAt: new Date(), deletedAt,
  })
}

function makeRoomType(): RoomType {
  return new RoomType({
    id: 'rt-1',
    hotelId: 'hotel-1',
    organizationId: 'org-1',
    name: 'Deluxe',
    description: null,
    basePrice: 150,
    maxOccupancy: 2,
    amenities: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
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

function makeRoomTypeRepo(): jest.Mocked<IRoomTypeRepository> {
  return {
    findById: jest.fn(),
    findByHotelAndName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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

describe('CreateRoomType', () => {
  let hotelRepo: jest.Mocked<IHotelRepository>
  let roomTypeRepo: jest.Mocked<IRoomTypeRepository>
  let useCase: CreateRoomType

  beforeEach(() => {
    jest.clearAllMocks()
    hotelRepo = makeHotelRepo()
    roomTypeRepo = makeRoomTypeRepo()
    useCase = new CreateRoomType(hotelRepo, roomTypeRepo, mockPublisher, mockLogger)
  })

  it('creates a room type successfully', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())
    roomTypeRepo.findByHotelAndName.mockResolvedValue(null)
    roomTypeRepo.create.mockResolvedValue(makeRoomType())

    const result = await useCase.execute(
      { hotelId: 'hotel-1', name: 'Deluxe', basePrice: 150, maxOccupancy: 2 },
      'org-1',
      'corr-1'
    )

    expect(roomTypeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ hotelId: 'hotel-1', name: 'Deluxe', organizationId: 'org-1' })
    )
    expect(result.id).toBe('rt-1')
  })

  it('throws NotFoundError when hotel does not exist', async () => {
    hotelRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute({ hotelId: 'hotel-1', name: 'Deluxe', basePrice: 100, maxOccupancy: 2 }, 'org-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when hotel belongs to different org', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())

    await expect(
      useCase.execute({ hotelId: 'hotel-1', name: 'Deluxe', basePrice: 100, maxOccupancy: 2 }, 'org-999')
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when hotel is inactive', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel('INACTIVE'))

    await expect(
      useCase.execute({ hotelId: 'hotel-1', name: 'Deluxe', basePrice: 100, maxOccupancy: 2 }, 'org-1')
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ConflictError when room type name already exists in hotel', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())
    roomTypeRepo.findByHotelAndName.mockResolvedValue(makeRoomType())

    await expect(
      useCase.execute({ hotelId: 'hotel-1', name: 'Deluxe', basePrice: 100, maxOccupancy: 2 }, 'org-1')
    ).rejects.toThrow(ConflictError)
  })

  it('publishes room_type.created event (fire-and-forget)', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())
    roomTypeRepo.findByHotelAndName.mockResolvedValue(null)
    roomTypeRepo.create.mockResolvedValue(makeRoomType())

    await useCase.execute(
      { hotelId: 'hotel-1', name: 'Deluxe', basePrice: 150, maxOccupancy: 2 },
      'org-1',
      'corr-pub'
    )
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'hotel.events',
      expect.objectContaining({ eventType: 'hotel.room_type.created' })
    )
  })
})
