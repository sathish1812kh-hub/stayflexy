import { CheckIn } from '../../application/use-cases/CheckIn'
import { CheckOut } from '../../application/use-cases/CheckOut'
import { Booking } from '../../domain/entities/Booking'
import { BookingRoom } from '../../domain/entities/BookingRoom'
import { BookingGuest } from '../../domain/entities/BookingGuest'
import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IBookingRepository, FullBooking } from '../../domain/repositories/IBookingRepository'
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
    primaryGuestId: null,
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

function makeFullBooking(status: Booking['status'] = 'CONFIRMED'): FullBooking {
  return {
    booking: makeBooking(status),
    rooms: [
      new BookingRoom({
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
      }),
    ],
    guests: [
      new BookingGuest({
        id: 'g-1',
        bookingId: 'booking-1',
        isPrimary: true,
        firstName: 'Jane',
        lastName: 'Smith',
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
    updateStatus: jest.fn().mockResolvedValue(makeBooking('CHECKED_IN')),
    updateRoomStatuses: jest.fn().mockResolvedValue(undefined),
    addAuditEntry: jest.fn().mockResolvedValue(undefined),
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

// ─── CheckIn Tests ────────────────────────────────────────────────────────────

describe('CheckIn', () => {
  let bookingRepo: jest.Mocked<IBookingRepository>
  let cache: jest.Mocked<BookingCache>
  let useCase: CheckIn

  beforeEach(() => {
    jest.clearAllMocks()
    bookingRepo = makeBookingRepo()
    cache = makeCache()
    useCase = new CheckIn(bookingRepo, cache, mockPublisher, mockLogger)
  })

  it('checks in a CONFIRMED booking', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CONFIRMED'))

    const result = await useCase.execute('booking-1', 'user-1', 'org-1', 'corr-1')

    expect(bookingRepo.updateStatus).toHaveBeenCalledWith(
      'booking-1',
      'CHECKED_IN',
      expect.objectContaining({ checkedInById: 'user-1' })
    )
    expect(bookingRepo.updateRoomStatuses).toHaveBeenCalledWith('booking-1', 'OCCUPIED')
    expect(cache.invalidate).toHaveBeenCalledWith('booking-1')
    expect(result.booking.status).toBe('CHECKED_IN')
  })

  it('checks in a PENDING booking', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('PENDING'))

    await useCase.execute('booking-1', 'user-1', 'org-1')

    expect(bookingRepo.updateStatus).toHaveBeenCalledWith('booking-1', 'CHECKED_IN', expect.anything())
  })

  it('throws NotFoundError when booking does not exist', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(null)

    await expect(
      useCase.execute('nonexistent', 'user-1', 'org-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError for cross-org access', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CONFIRMED'))

    await expect(
      useCase.execute('booking-1', 'user-1', 'org-other')
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws BadRequestError when checking in a CANCELLED booking', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CANCELLED'))

    await expect(
      useCase.execute('booking-1', 'user-1', 'org-1')
    ).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError when checking in an already CHECKED_IN booking', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CHECKED_IN'))

    await expect(
      useCase.execute('booking-1', 'user-1', 'org-1')
    ).rejects.toThrow(BadRequestError)
  })

  it('publishes booking.checked_in event', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CONFIRMED'))

    await useCase.execute('booking-1', 'user-1', 'org-1', 'corr-pub')
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'booking.events',
      expect.objectContaining({ eventType: 'booking.checked_in' })
    )
  })
})

// ─── CheckOut Tests ───────────────────────────────────────────────────────────

describe('CheckOut', () => {
  let bookingRepo: jest.Mocked<IBookingRepository>
  let cache: jest.Mocked<BookingCache>
  let useCase: CheckOut

  beforeEach(() => {
    jest.clearAllMocks()
    bookingRepo = makeBookingRepo()
    cache = makeCache()
    useCase = new CheckOut(bookingRepo, cache, mockPublisher, mockLogger)

    // Override mock to return CHECKED_OUT booking
    bookingRepo.updateStatus.mockResolvedValue(makeBooking('CHECKED_OUT'))
  })

  it('checks out a CHECKED_IN booking', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CHECKED_IN'))

    const result = await useCase.execute('booking-1', 'user-1', 'org-1')

    expect(bookingRepo.updateStatus).toHaveBeenCalledWith(
      'booking-1',
      'CHECKED_OUT',
      expect.objectContaining({ checkedOutById: 'user-1' })
    )
    expect(bookingRepo.updateRoomStatuses).toHaveBeenCalledWith('booking-1', 'VACATED')
    expect(cache.invalidate).toHaveBeenCalledWith('booking-1')
    expect(result.booking.status).toBe('CHECKED_OUT')
  })

  it('throws BadRequestError when checking out a CONFIRMED booking (not yet checked in)', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CONFIRMED'))

    await expect(
      useCase.execute('booking-1', 'user-1', 'org-1')
    ).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError when checking out a CANCELLED booking', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CANCELLED'))

    await expect(
      useCase.execute('booking-1', 'user-1', 'org-1')
    ).rejects.toThrow(BadRequestError)
  })

  it('throws ForbiddenError for cross-org access', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CHECKED_IN'))

    await expect(
      useCase.execute('booking-1', 'user-1', 'org-other')
    ).rejects.toThrow(ForbiddenError)
  })

  it('publishes booking.checked_out event', async () => {
    bookingRepo.findByIdWithDetails.mockResolvedValue(makeFullBooking('CHECKED_IN'))

    await useCase.execute('booking-1', 'user-1', 'org-1', 'corr-pub')
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'booking.events',
      expect.objectContaining({ eventType: 'booking.checked_out' })
    )
  })
})
