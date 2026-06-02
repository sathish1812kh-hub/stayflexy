import { UpdateRoomStatus } from '../../application/use-cases/UpdateRoomStatus'
import { Hotel } from '../../domain/entities/Hotel'
import { Room } from '../../domain/entities/Room'
import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IHotelRepository } from '../../domain/repositories/IHotelRepository'
import type { IRoomRepository } from '../../domain/repositories/IRoomRepository'
import type { RoomCache } from '../../application/services/RoomCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeHotel(status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE'): Hotel {
  return new Hotel({
    id: 'hotel-1', organizationId: 'org-1', name: 'Grand Palace', slug: 'grand-palace',
    address: null, city: 'Mumbai', state: null, country: 'IN', postalCode: null,
    phone: null, email: null, website: null, starRating: null,
    status, timezone: 'UTC', checkInTime: '14:00', checkOutTime: '11:00',
    metadata: null, createdById: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
  })
}

function makeRoom(
  status: Room['status'] = 'AVAILABLE',
  isActive = true,
  orgId = 'org-1'
): Room {
  return new Room({
    id: 'room-1', hotelId: 'hotel-1', organizationId: orgId, roomTypeId: 'rt-1',
    roomNumber: '101', floor: 1, status, isActive, notes: null, metadata: null,
    createdAt: new Date(), updatedAt: new Date(),
  })
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makeHotelRepo(): jest.Mocked<IHotelRepository> {
  return { findById: jest.fn(), findBySlug: jest.fn(), create: jest.fn(), update: jest.fn(), softDelete: jest.fn(), findMany: jest.fn() }
}

function makeRoomRepo(): jest.Mocked<IRoomRepository> {
  return {
    findById: jest.fn(),
    findByHotelAndNumber: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    findMany: jest.fn(),
    createStatusAudit: jest.fn().mockResolvedValue(undefined),
  }
}

function makeCache(): jest.Mocked<RoomCache> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<RoomCache>
}

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  isConnected: () => false,
}

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UpdateRoomStatus', () => {
  let hotelRepo: jest.Mocked<IHotelRepository>
  let roomRepo: jest.Mocked<IRoomRepository>
  let cache: jest.Mocked<RoomCache>
  let useCase: UpdateRoomStatus

  beforeEach(() => {
    jest.clearAllMocks()
    hotelRepo = makeHotelRepo()
    roomRepo = makeRoomRepo()
    cache = makeCache()
    useCase = new UpdateRoomStatus(hotelRepo, roomRepo, cache, mockPublisher, mockLogger)
  })

  it('transitions AVAILABLE → OCCUPIED successfully', async () => {
    roomRepo.findById.mockResolvedValue(makeRoom('AVAILABLE'))
    hotelRepo.findById.mockResolvedValue(makeHotel())
    roomRepo.updateStatus.mockResolvedValue(makeRoom('OCCUPIED'))

    const result = await useCase.execute('room-1', { status: 'OCCUPIED' }, 'user-1', 'org-1')

    expect(roomRepo.updateStatus).toHaveBeenCalledWith('room-1', 'OCCUPIED')
    expect(roomRepo.createStatusAudit).toHaveBeenCalledWith(
      expect.objectContaining({ fromStatus: 'AVAILABLE', toStatus: 'OCCUPIED', changedBy: 'user-1' })
    )
    expect(cache.invalidate).toHaveBeenCalledWith('room-1')
    expect(result.status).toBe('OCCUPIED')
  })

  it('throws NotFoundError when room does not exist', async () => {
    roomRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute('room-1', { status: 'OCCUPIED' }, 'user-1', 'org-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when room belongs to different org', async () => {
    roomRepo.findById.mockResolvedValue(makeRoom('AVAILABLE', true, 'org-1'))

    await expect(
      useCase.execute('room-1', { status: 'OCCUPIED' }, 'user-1', 'org-999')
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when room is inactive', async () => {
    roomRepo.findById.mockResolvedValue(makeRoom('AVAILABLE', false))

    await expect(
      useCase.execute('room-1', { status: 'OCCUPIED' }, 'user-1', 'org-1')
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when hotel is inactive', async () => {
    roomRepo.findById.mockResolvedValue(makeRoom('AVAILABLE'))
    hotelRepo.findById.mockResolvedValue(makeHotel('INACTIVE'))

    await expect(
      useCase.execute('room-1', { status: 'OCCUPIED' }, 'user-1', 'org-1')
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws BadRequestError for invalid status transition', async () => {
    // OCCUPIED cannot go directly to AVAILABLE (yes it can, let's use BLOCKED → OCCUPIED)
    roomRepo.findById.mockResolvedValue(makeRoom('BLOCKED'))
    hotelRepo.findById.mockResolvedValue(makeHotel())

    await expect(
      useCase.execute('room-1', { status: 'OCCUPIED' }, 'user-1', 'org-1')
    ).rejects.toThrow(BadRequestError)
  })

  it('accepts optional reason in audit log', async () => {
    roomRepo.findById.mockResolvedValue(makeRoom('AVAILABLE'))
    hotelRepo.findById.mockResolvedValue(makeHotel())
    roomRepo.updateStatus.mockResolvedValue(makeRoom('MAINTENANCE'))

    await useCase.execute(
      'room-1',
      { status: 'MAINTENANCE', reason: 'Plumbing repair' },
      'user-1',
      'org-1'
    )

    expect(roomRepo.createStatusAudit).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Plumbing repair' })
    )
  })

  it('publishes room.status_updated event (fire-and-forget)', async () => {
    roomRepo.findById.mockResolvedValue(makeRoom('AVAILABLE'))
    hotelRepo.findById.mockResolvedValue(makeHotel())
    roomRepo.updateStatus.mockResolvedValue(makeRoom('HOUSEKEEPING'))

    await useCase.execute('room-1', { status: 'HOUSEKEEPING' }, 'user-1', 'org-1', 'corr-pub')
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'hotel.events',
      expect.objectContaining({ eventType: 'hotel.room.status_updated' })
    )
  })

  it('all valid transitions from AVAILABLE work', async () => {
    const targets: Array<Room['status']> = ['OCCUPIED', 'HOUSEKEEPING', 'MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED']
    for (const target of targets) {
      roomRepo.findById.mockResolvedValue(makeRoom('AVAILABLE'))
      hotelRepo.findById.mockResolvedValue(makeHotel())
      roomRepo.updateStatus.mockResolvedValue(makeRoom(target))

      await expect(
        useCase.execute('room-1', { status: target }, 'user-1', 'org-1')
      ).resolves.toBeDefined()
    }
  })
})
