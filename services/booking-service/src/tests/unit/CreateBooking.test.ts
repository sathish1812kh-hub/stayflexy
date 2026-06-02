import { CreateBooking } from '../../application/use-cases/CreateBooking'
import { Booking } from '../../domain/entities/Booking'
import { BookingRoom } from '../../domain/entities/BookingRoom'
import { BookingGuest } from '../../domain/entities/BookingGuest'
import { ConflictError, BadRequestError } from '@stayflexi/shared-errors'
import type { IBookingRepository, FullBooking } from '../../domain/repositories/IBookingRepository'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { RedisDistributedLock } from '../../infrastructure/locking/RedisDistributedLock'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// Mock the shared-database import in CreateBooking
jest.mock('@stayflexi/shared-database', () => ({
  getPrismaClient: () => ({
    roomType: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'rt-1', basePrice: { toNumber: () => 150 } },
      ]),
    },
  }),
  Prisma: {},
}))

const makeBooking = (): Booking => new Booking({
  id: 'booking-1', organizationId: 'org-1', hotelId: 'hotel-1', bookingNumber: 'BK-ABC-123',
  status: 'CONFIRMED', source: 'DIRECT', primaryGuestId: 'guest-1',
  amounts: { totalAmount: 300, taxAmount: 30, discountAmount: 0, finalAmount: 330, currency: 'USD' },
  specialRequests: null, internalNotes: null, bookedById: 'user-1',
  checkedInAt: null, checkedInById: null, checkedOutAt: null, checkedOutById: null,
  cancelledAt: null, cancelledById: null, cancellationReason: null, cancellationNote: null,
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
})

const makeFullBooking = (): FullBooking => ({
  booking: makeBooking(),
  rooms: [new BookingRoom({ id: 'br-1', bookingId: 'booking-1', roomId: 'room-1', roomTypeId: 'rt-1', hotelId: 'hotel-1', checkInDate: new Date('2026-06-01'), checkOutDate: new Date('2026-06-03'), nightCount: 2, adultCount: 2, childCount: 0, roomRate: 150, totalRoomAmount: 300, status: 'RESERVED' })],
  guests: [new BookingGuest({ id: 'guest-1', bookingId: 'booking-1', isPrimary: true, firstName: 'John', lastName: 'Doe', email: null, phone: null, nationality: null, governmentIdType: null, governmentIdNumber: null, dateOfBirth: null })],
})

const mockBookingRepo: jest.Mocked<IBookingRepository> = {
  findById: jest.fn(), findByIdWithDetails: jest.fn(), findByBookingNumber: jest.fn(),
  findByOrganization: jest.fn(), findOverlappingRoomBookings: jest.fn().mockResolvedValue([]),
  createWithDetails: jest.fn().mockResolvedValue(makeFullBooking()),
  updateStatus: jest.fn(), updateRoomStatuses: jest.fn(), addAuditEntry: jest.fn(),
}

const mockInventoryRepo: jest.Mocked<IInventoryRepository> = {
  checkAvailability: jest.fn().mockResolvedValue(true),
  getAvailabilityForRange: jest.fn(), reserveInventory: jest.fn().mockResolvedValue(undefined),
  releaseInventory: jest.fn(),
}

const mockLock = {
  acquire: jest.fn().mockResolvedValue('lock-token'),
  release: jest.fn().mockResolvedValue(true),
  withLock: jest.fn().mockImplementation(async (_r: unknown, fn: () => Promise<unknown>) => fn()),
  isLocked: jest.fn().mockResolvedValue(false),
} as unknown as jest.Mocked<RedisDistributedLock>

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(), disconnect: jest.fn(), isConnected: () => false,
}

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

const validDto = {
  hotelId: '00000000-0000-0000-0000-000000000001',
  checkInDate: '2026-06-01',
  checkOutDate: '2026-06-03',
  rooms: [{ roomId: '00000000-0000-0000-0000-000000000002', roomTypeId: 'rt-1', adultCount: 2, childCount: 0 }],
  guests: [{ firstName: 'John', lastName: 'Doe' }],
  source: 'DIRECT' as const,
  currency: 'USD',
}

const ctx = { organizationId: 'org-1', userId: 'user-1', maxAdvanceBookingDays: 365, maxRoomsPerBooking: 10 }

describe('CreateBooking', () => {
  let useCase: CreateBooking

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateBooking(mockBookingRepo, mockInventoryRepo, mockLock, mockPublisher, mockLogger)
  })

  it('creates a booking successfully with distributed lock', async () => {
    const result = await useCase.execute(validDto, ctx)
    expect(result.booking.organizationId).toBe('org-1')
    expect(mockLock.acquire).toHaveBeenCalled()
    expect(mockLock.release).toHaveBeenCalled()
    expect(mockBookingRepo.createWithDetails).toHaveBeenCalled()
  })

  it('throws ConflictError when room has overlapping booking (overbooking prevention)', async () => {
    const room = new BookingRoom({ id: 'br-existing', bookingId: 'other-booking', roomId: '00000000-0000-0000-0000-000000000002', roomTypeId: 'rt-1', hotelId: 'hotel-1', checkInDate: new Date('2026-06-02'), checkOutDate: new Date('2026-06-04'), nightCount: 2, adultCount: 1, childCount: 0, roomRate: 150, totalRoomAmount: 300, status: 'RESERVED' })
    mockBookingRepo.findOverlappingRoomBookings.mockResolvedValue([room])
    await expect(useCase.execute(validDto, ctx)).rejects.toThrow(ConflictError)
  })

  it('throws ConflictError when inventory unavailable', async () => {
    mockInventoryRepo.checkAvailability.mockResolvedValue(false)
    await expect(useCase.execute(validDto, ctx)).rejects.toThrow(ConflictError)
  })

  it('throws ConflictError when distributed lock cannot be acquired', async () => {
    jest.mocked(mockLock.acquire).mockResolvedValue(null)
    await expect(useCase.execute(validDto, ctx)).rejects.toThrow(ConflictError)
  })

  it('throws BadRequestError for invalid date range (checkout before checkin)', async () => {
    const badDto = { ...validDto, checkInDate: '2026-06-05', checkOutDate: '2026-06-03' }
    await expect(useCase.execute(badDto, ctx)).rejects.toThrow(BadRequestError)
  })

  it('always releases lock even when booking creation fails', async () => {
    mockBookingRepo.createWithDetails.mockRejectedValue(new Error('DB error'))
    await expect(useCase.execute(validDto, ctx)).rejects.toThrow()
    expect(mockLock.release).toHaveBeenCalled()
  })

  it('publishes booking.created event after successful creation', async () => {
    await useCase.execute(validDto, ctx)
    await new Promise(resolve => setImmediate(resolve))
    expect(mockPublisher.publish).toHaveBeenCalledWith('booking.events', expect.objectContaining({ eventType: 'booking.created' }))
  })
})
