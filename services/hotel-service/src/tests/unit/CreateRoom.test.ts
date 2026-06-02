import { CreateRoom } from '../../application/use-cases/CreateRoom'
import { Hotel } from '../../domain/entities/Hotel'
import { RoomType } from '../../domain/entities/RoomType'
import { Room } from '../../domain/entities/Room'
import { NotFoundError, ForbiddenError, ConflictError } from '@stayflexi/shared-errors'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { IRoomTypeRepository } from '../../domain/repositories/IRoomTypeRepository'
import type { IRoomRepository } from '../../domain/repositories/IRoomRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeHotel(
  status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE',
  deletedAt: Date | null = null
): Hotel {
  return new Hotel({
    id: 'hotel-1', organizationId: 'org-1', name: 'Grand Palace', slug: 'grand-palace',
    address: null, city: 'Mumbai', state: null, country: 'IN', postalCode: null,
    phone: null, email: null, website: null, starRating: null,
    status, timezone: 'UTC', checkInTime: '14:00', checkOutTime: '11:00',
    metadata: null, createdById: null, createdAt: new Date(), updatedAt: new Date(), deletedAt,
  })
}

function makeRoomType(hotelId = 'hotel-1', isActive = true): RoomType {
  return new RoomType({
    id: 'rt-1', hotelId, organizationId: 'org-1',
    name: 'Standard', description: null, basePrice: 100, maxOccupancy: 2,
    amenities: null, isActive, createdAt: new Date(), updatedAt: new Date(),
  })
}

function makeRoom(): Room {
  return new Room({
    id: 'room-1', hotelId: 'hotel-1', organizationId: 'org-1', roomTypeId: 'rt-1',
    roomNumber: '101', floor: 1, status: 'AVAILABLE', isActive: true,
    notes: null, metadata: null, createdAt: new Date(), updatedAt: new Date(),
  })
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makeHotelRepo(): jest.Mocked<IHotelRepository> {
  return { findById: jest.fn(), findBySlug: jest.fn(), create: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findMany: jest.fn() }
}

function makeRoomTypeRepo(): jest.Mocked<IRoomTypeRepository> {
  return { findById: jest.fn(), findByHotelAndName: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() }
}

function makeRoomRepo(): jest.Mocked<IRoomRepository> {
  return { findById: jest.fn(), findByHotelAndNumber: jest.fn(), create: jest.fn(), update: jest.fn(), updateStatus: jest.fn(), findMany: jest.fn(), createStatusAudit: jest.fn() }
}

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  isConnected: () => false,
}

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CreateRoom', () => {
  let hotelRepo: jest.Mocked<IHotelRepository>
  let roomTypeRepo: jest.Mocked<IRoomTypeRepository>
  let roomRepo: jest.Mocked<IRoomRepository>
  let useCase: CreateRoom

  beforeEach(() => {
    jest.clearAllMocks()
    hotelRepo = makeHotelRepo()
    roomTypeRepo = makeRoomTypeRepo()
    roomRepo = makeRoomRepo()
    useCase = new CreateRoom(hotelRepo, roomTypeRepo, roomRepo, mockPublisher, mockLogger)
  })

  it('creates a room successfully', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())
    roomTypeRepo.findById.mockResolvedValue(makeRoomType())
    roomRepo.findByHotelAndNumber.mockResolvedValue(null)
    roomRepo.create.mockResolvedValue(makeRoom())

    const result = await useCase.execute(
      { hotelId: 'hotel-1', roomTypeId: 'rt-1', roomNumber: '101', floor: 1 },
      'org-1',
      'corr-1'
    )

    expect(roomRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ hotelId: 'hotel-1', roomNumber: '101', organizationId: 'org-1' })
    )
    expect(result.id).toBe('room-1')
  })

  it('throws NotFoundError when hotel does not exist', async () => {
    hotelRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute({ hotelId: 'hotel-1', roomTypeId: 'rt-1', roomNumber: '101' }, 'org-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when hotel belongs to different org', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())

    await expect(
      useCase.execute({ hotelId: 'hotel-1', roomTypeId: 'rt-1', roomNumber: '101' }, 'org-999')
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when hotel is inactive', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel('INACTIVE'))

    await expect(
      useCase.execute({ hotelId: 'hotel-1', roomTypeId: 'rt-1', roomNumber: '101' }, 'org-1')
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws NotFoundError when room type is inactive', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())
    roomTypeRepo.findById.mockResolvedValue(makeRoomType('hotel-1', false))

    await expect(
      useCase.execute({ hotelId: 'hotel-1', roomTypeId: 'rt-1', roomNumber: '101' }, 'org-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when room type belongs to different hotel', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())
    roomTypeRepo.findById.mockResolvedValue(makeRoomType('hotel-999'))

    await expect(
      useCase.execute({ hotelId: 'hotel-1', roomTypeId: 'rt-1', roomNumber: '101' }, 'org-1')
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ConflictError when room number already exists in hotel', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())
    roomTypeRepo.findById.mockResolvedValue(makeRoomType())
    roomRepo.findByHotelAndNumber.mockResolvedValue(makeRoom())

    await expect(
      useCase.execute({ hotelId: 'hotel-1', roomTypeId: 'rt-1', roomNumber: '101' }, 'org-1')
    ).rejects.toThrow(ConflictError)
  })

  it('publishes room.created event (fire-and-forget)', async () => {
    hotelRepo.findById.mockResolvedValue(makeHotel())
    roomTypeRepo.findById.mockResolvedValue(makeRoomType())
    roomRepo.findByHotelAndNumber.mockResolvedValue(null)
    roomRepo.create.mockResolvedValue(makeRoom())

    await useCase.execute(
      { hotelId: 'hotel-1', roomTypeId: 'rt-1', roomNumber: '101' },
      'org-1',
      'corr-pub'
    )
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'hotel.events',
      expect.objectContaining({ eventType: 'hotel.room.created' })
    )
  })
})
