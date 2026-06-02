// FILE: src/modules/booking/repositories/index.ts
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  Booking,
  BookingRoom,
  BookingGuest,
  BookingAudit,
  BookingStatus,
  BookingRoomStatus,
  BookingAuditEvent,
  CreateBookingInput,
} from "../types";
import type { BookingFilterDtoType } from "../dto";

// ─── BookingRepository ────────────────────────────────────────────────────────

export abstract class BookingRepository extends BaseRepository<
  Booking,
  CreateBookingInput,
  Partial<Booking>
> {
  abstract override findById(id: string): Promise<Nullable<Booking>>;
  abstract override findMany(params: PaginationParams): Promise<PaginatedResult<Booking>>;
  abstract override create(data: CreateBookingInput): Promise<Booking>;
  abstract override update(id: string, data: Partial<Booking>): Promise<Booking>;
  abstract override hardDelete(id: string): Promise<void>;

  abstract findByNumber(bookingNumber: string): Promise<Nullable<Booking>>;
  abstract findByHotel(
    hotelId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Booking>>;
  abstract findByOrganization(
    orgId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Booking>>;
  abstract findManyFiltered(
    filters: BookingFilterDtoType,
    orgId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Booking>>;
  abstract softDelete(id: string): Promise<void>;
  abstract updateStatus(
    id: string,
    status: BookingStatus,
    extra?: Partial<Booking>
  ): Promise<Booking>;
  abstract countByHotel(hotelId: string): Promise<number>;
  abstract sumRevenueByHotel(hotelId: string, from: Date, to: Date): Promise<number>;
}

// ─── BookingRoomRepository ────────────────────────────────────────────────────

export interface CreateBookingRoomData {
  bookingId: string;
  roomId: string;
  roomTypeId: string;
  hotelId: string;
  checkInDate: Date;
  checkOutDate: Date;
  nightCount: number;
  adultCount: number;
  childCount: number;
  roomRate: number;
  totalRoomAmount: number;
  status: BookingRoomStatus;
  specialRequests?: string;
}

export abstract class BookingRoomRepository extends BaseRepository<
  BookingRoom,
  CreateBookingRoomData,
  Partial<BookingRoom>
> {
  abstract override findById(id: string): Promise<Nullable<BookingRoom>>;
  abstract override findMany(params: PaginationParams): Promise<PaginatedResult<BookingRoom>>;
  abstract override create(data: CreateBookingRoomData): Promise<BookingRoom>;
  abstract override update(id: string, data: Partial<BookingRoom>): Promise<BookingRoom>;
  abstract override hardDelete(id: string): Promise<void>;

  abstract findByBooking(bookingId: string): Promise<BookingRoom[]>;
  abstract findByRoom(roomId: string, params: PaginationParams): Promise<PaginatedResult<BookingRoom>>;
  abstract hasOverlap(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string
  ): Promise<boolean>;
  abstract updateStatus(id: string, status: BookingRoomStatus): Promise<BookingRoom>;
}

// ─── BookingGuestRepository ───────────────────────────────────────────────────

export interface CreateBookingGuestData {
  bookingId: string;
  isPrimary: boolean;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  nationality?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  dateOfBirth?: Date;
}

export abstract class BookingGuestRepository extends BaseRepository<
  BookingGuest,
  CreateBookingGuestData,
  Partial<BookingGuest>
> {
  abstract override findById(id: string): Promise<Nullable<BookingGuest>>;
  abstract override findMany(params: PaginationParams): Promise<PaginatedResult<BookingGuest>>;
  abstract override create(data: CreateBookingGuestData): Promise<BookingGuest>;
  abstract override update(id: string, data: Partial<BookingGuest>): Promise<BookingGuest>;
  abstract override hardDelete(id: string): Promise<void>;

  abstract findByBooking(bookingId: string): Promise<BookingGuest[]>;
  abstract findPrimary(bookingId: string): Promise<Nullable<BookingGuest>>;
}

// ─── BookingAuditRepository ───────────────────────────────────────────────────

export interface CreateBookingAuditData {
  bookingId: string;
  eventType: BookingAuditEvent;
  eventDescription: string;
  performedById: string;
  metadata?: unknown;
}

export abstract class BookingAuditRepository extends BaseRepository<
  BookingAudit,
  CreateBookingAuditData,
  never
> {
  abstract override findById(id: string): Promise<Nullable<BookingAudit>>;
  abstract override findMany(params: PaginationParams): Promise<PaginatedResult<BookingAudit>>;
  abstract override create(data: CreateBookingAuditData): Promise<BookingAudit>;

  override update(_id: string, _data: never): Promise<BookingAudit> {
    return Promise.reject(new Error("Booking audit logs are immutable"));
  }

  override hardDelete(_id: string): Promise<void> {
    return Promise.reject(new Error("Booking audit logs are immutable"));
  }

  abstract findByBooking(bookingId: string): Promise<BookingAudit[]>;
  abstract logEvent(
    bookingId: string,
    event: BookingAuditEvent,
    description: string,
    performedById: string,
    metadata?: unknown
  ): Promise<BookingAudit>;
}
