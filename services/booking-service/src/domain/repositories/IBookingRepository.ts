import type { Booking, BookingStatus } from '../entities/Booking'
import type { BookingRoom } from '../entities/BookingRoom'
import type { BookingGuest } from '../entities/BookingGuest'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateBookingData {
  organizationId: string
  hotelId: string
  bookingNumber: string
  status: BookingStatus
  source: string
  totalAmount: number
  taxAmount: number
  discountAmount: number
  finalAmount: number
  currency: string
  specialRequests?: string | null
  internalNotes?: string | null
  bookedById: string
}

export interface CreateBookingRoomData {
  bookingId: string
  roomId: string
  roomTypeId: string
  hotelId: string
  checkInDate: Date
  checkOutDate: Date
  nightCount: number
  adultCount: number
  childCount: number
  roomRate: number
  totalRoomAmount: number
}

export interface CreateBookingGuestData {
  bookingId: string
  isPrimary: boolean
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  nationality?: string | null
  governmentIdType?: string | null
  governmentIdNumber?: string | null
  dateOfBirth?: Date | null
}

export interface BookingSearchParams {
  organizationId: string
  hotelId?: string
  status?: BookingStatus
  source?: string
  startDate?: Date
  endDate?: Date
  guestEmail?: string
  guestName?: string
  bookingNumber?: string
  page: number
  limit: number
}

export interface FullBooking {
  booking: Booking
  rooms: BookingRoom[]
  guests: BookingGuest[]
}

export interface IBookingRepository {
  findById(id: string): Promise<Booking | null>
  findByIdWithDetails(id: string): Promise<FullBooking | null>
  findByBookingNumber(bookingNumber: string): Promise<Booking | null>
  findByOrganization(params: BookingSearchParams): Promise<PaginatedResult<FullBooking>>
  findOverlappingRoomBookings(roomId: string, checkInDate: Date, checkOutDate: Date, excludeBookingId?: string): Promise<BookingRoom[]>
  createWithDetails(
    booking: CreateBookingData,
    rooms: Array<Omit<CreateBookingRoomData, 'bookingId'>>,
    guests: Array<Omit<CreateBookingGuestData, 'bookingId'>>
  ): Promise<FullBooking>
  updateStatus(id: string, status: BookingStatus, extra?: {
    checkedInAt?: Date; checkedInById?: string
    checkedOutAt?: Date; checkedOutById?: string
    cancelledAt?: Date; cancelledById?: string
    cancellationReason?: string; cancellationNote?: string
    primaryGuestId?: string
  }): Promise<Booking>
  updateRoomStatuses(bookingId: string, status: string): Promise<void>
  addAuditEntry(bookingId: string, eventType: string, description: string, performedById: string, metadata?: Record<string, unknown>): Promise<void>
}
