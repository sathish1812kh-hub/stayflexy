import { CancelBooking } from '../../application/use-cases/CancelBooking'
import { Booking } from '../../domain/entities/Booking'
import { BookingRoom } from '../../domain/entities/BookingRoom'
import { BookingGuest } from '../../domain/entities/BookingGuest'
import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IBookingRepository, FullBooking } from '../../domain/repositories/IBookingRepository'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { BookingCache } from '../../infrastructure/cache/BookingCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeBooking(status: Booking['status'] = 'CONFIRMED', orgId = 'org-1'): Booking {
  return new Booking({
    id: 'booking-1',
    organizationId: orgId,
    hotelId: 'hotel-1',
    bookingNumber: 'BK-TEST-001',
    status,
    source: 'DIRECT',
    primaryGuestId: 'guest-1',
    amounts: { totalAmount: 300, taxAmount: 30, discountAmount: 0, finalAmount: 330, currency: 'USD' },
    specialRequests: null,
    internalNotes: null,
    bookedById: 'user-1',
    checkedInAt: null,
    checkedInById: null,
    checkedOutAt: null,
    checkedOutById: null,
    cancelledAt: null,
    cancelledById: null,
    cancellationReason: null,
    cancellationNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  })
}

function makeRoom(): BookingRoom {
  return new BookingRoom({
    id: 'br-1',
    bookingId: 'booking-1',
    roomId: 'room-1',
    roomTypeId: 'rt-1',
    hotelId: 'hotel-1',
    checkInDate: new Date('2026-07-01'),
    checkOutDate: new Date('2026-07-03'),
    nightCount: 2,
    adultCount: 2,
    childCount: 0,
    roomRate: 150,
    totalRoomAmount: 300,
    status: 'RESERVED',
  })
}

function makeFullBooking(status: Booking['status'] = 'CONFIRMED'): FullBooking {
  return {
    booking: makeBooking(status),
    rooms: [makeRoom()],
    guests: [
      new BookingGuest({
        id: 'guest-1',
        bookingId: 'booking-1',
        isPrimary: true,
        firstName: 'John',
        lastName: 'Doe',
        email: null,
        phone: null,
        nationality: null,
        governmentIdType: null,
        governmentIdNumber: null,
        dateOfBirth: null,
      }),
    ],
  }
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makeBookingRepo(): jest.Mocked<IBookingRepository> {
  return {
    findById: jest.fn(),
    findByIdWithDetails: jest.fn(),
    findByBookingNumber: jest.fn(),
    findByOrganization: jest.fn(),
    findOverlappingRoomBookings: jest.fn(),
    createWithDetails: jest.fn(),
    updateStatus: jest.fn().mockResolvedValue(makeBooking('CANCELLED')),
    updateRoomStatuses: jest.fn().mockResolvedValue(undefined),
    addAuditEntry: jest.fn().mockResolvedValue(undefined),
  }
}

function makeInventoryRepo(): jest.Mocked<IInventoryRepository> {
  return {
    checkAvailability: jest.fn(),
    getAvailabilityForRange: jest.fn(),
    reserveInventory: jest.fn(),
    releaseInventory: jest.fn().mockResolvedValue(undefined),
  }
}

function makeCache(): jest.Mocked<BookingCache> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<BookingCache>
}

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: () => false,
}

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

const cancelDto = { cancellationReason: 'GUEST_REQUEST' as const }

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CancelBooking', () => {
  let bookingRepo: jest.Mocked<IBookingRepository>
  let inventoryRepo: jest.Mocked<IInventoryRepository>
  let cache: jest.Mocked<BookingCache>
  let useCase: CancelBooking

  beforeEach(() => {
    jest.clearAllMocks()
    bookingRepo = makeBookingRepo()
    inventoryRepo = makeInventoryRepo()
    cache = makeCache()
    useCase = new CancelBooking(bookingRepo, inventoryRepo, cache, mockPublisher, mockLogger)
  })

  it('cancels a CONFIRMED booking successfully', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CONFIRMED'))
    bookingRepo.findByIdWithDetails.mockResolvedValueOnce(makeFullBooking('CONFIRMED'))
    bookingRepo.findByIdWithDetails.mockResolvedValueOnce(makeFullBooking('CANCELLED'))

    const result = await useCase.execute('booking-1', cancelDto, 'user-1', 'org-1')

    expect(bookingRepo.updateStatus).toHaveBeenCalledWith(
      'booking-1',
      'CANCELLED',
      expect.objectContaining({ cancelledById: 'user-1', cancellationReason: 'GUEST_REQUEST' })
    )
    expect(bookingRepo.updateRoomStatuses).toHaveBeenCalledWith('booking-1', 'CANCELLED')
    expect(cache.invalidate).toHaveBeenCalledWith('booking-1')
  })

  it('cancels a PENDING booking successfully', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValueOnce(makeFullBooking('PENDING'))
    bookingRepo.findByIdWithDetails.mockResolvedValueOnce(makeFullBooking('CANCELLED'))

    await useCase.execute('booking-1', cancelDto, 'user-1', 'org-1')

    expect(bookingRepo.updateStatus).toHaveBeenCalledWith('booking-1', 'CANCELLED', expect.anything())
  })

  it('throws NotFoundError when booking does not exist', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(null)

    await expect(
      useCase.execute('nonexistent', cancelDto, 'user-1', 'org-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when booking belongs to different org', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CONFIRMED'))

    await expect(
      useCase.execute('booking-1', cancelDto, 'user-1', 'org-different')
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws BadRequestError when cancelling a CHECKED_IN booking', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CHECKED_IN'))

    await expect(
      useCase.execute('booking-1', cancelDto, 'user-1', 'org-1')
    ).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError when cancelling a CHECKED_OUT booking', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CHECKED_OUT'))

    await expect(
      useCase.execute('booking-1', cancelDto, 'user-1', 'org-1')
    ).rejects.toThrow(BadRequestError)
  })

  it('releases inventory for active rooms on cancellation', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValueOnce(makeFullBooking('CONFIRMED'))
    bookingRepo.findByIdWithDetails.mockResolvedValueOnce(makeFullBooking('CANCELLED'))

    await useCase.execute('booking-1', cancelDto, 'user-1', 'org-1')

    expect(inventoryRepo.releaseInventory).toHaveBeenCalledWith(
      'rt-1',
      expect.any(Date),
      expect.any(Date)
    )
  })

  it('publishes booking.cancelled event (fire-and-forget)', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValueOnce(makeFullBooking('CONFIRMED'))
    bookingRepo.findByIdWithDetails.mockResolvedValueOnce(makeFullBooking('CANCELLED'))

    await useCase.execute('booking-1', cancelDto, 'user-1', 'org-1', 'corr-cancel')
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'booking.events',
      expect.objectContaining({ eventType: 'booking.cancelled', organizationId: 'org-1' })
    )
  })

  it('adds audit entry on successful cancellation', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValueOnce(makeFullBooking('CONFIRMED'))
    bookingRepo.findByIdWithDetails.mockResolvedValueOnce(makeFullBooking('CANCELLED'))

    await useCase.execute('booking-1', cancelDto, 'user-1', 'org-1')

    expect(bookingRepo.addAuditEntry).toHaveBeenCalledWith(
      'booking-1',
      'CANCELLED',
      expect.any(String),
      'user-1',
      expect.any(Object)
    )
  })
})
