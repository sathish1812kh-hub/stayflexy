// FILE: src/modules/booking/types/index.ts
import type { Nullable, TimestampFields } from "@shared-types";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

export type BookingSource =
  | "DIRECT"
  | "OTA"
  | "WALK_IN"
  | "PHONE"
  | "EMAIL"
  | "AGENT"
  | "ONLINE";

export type CancellationReason =
  | "GUEST_REQUEST"
  | "NO_SHOW"
  | "HOTEL_REQUEST"
  | "FORCE_MAJEURE"
  | "DUPLICATE_BOOKING"
  | "OTHER";

export type GovIdType =
  | "PASSPORT"
  | "NATIONAL_ID"
  | "DRIVERS_LICENSE"
  | "OTHER";

export type BookingAuditEvent =
  | "CREATED"
  | "CONFIRMED"
  | "MODIFIED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW_MARKED"
  | "NOTE_ADDED"
  | "ROOM_CHANGED"
  | "GUEST_UPDATED"
  | "PAYMENT_RECORDED";

export type BookingRoomStatus =
  | "RESERVED"
  | "OCCUPIED"
  | "VACATED"
  | "CANCELLED";

export interface Booking extends TimestampFields {
  id: string;
  organizationId: string;
  hotelId: string;
  bookingNumber: string;
  status: BookingStatus;
  source: BookingSource;
  primaryGuestId: Nullable<string>;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  specialRequests: Nullable<string>;
  internalNotes: Nullable<string>;
  bookedById: string;
  checkedInAt: Nullable<Date>;
  checkedInById: Nullable<string>;
  checkedOutAt: Nullable<Date>;
  checkedOutById: Nullable<string>;
  cancelledAt: Nullable<Date>;
  cancelledById: Nullable<string>;
  cancellationReason: Nullable<CancellationReason>;
  cancellationNote: Nullable<string>;
  deletedAt: Nullable<Date>;
}

export interface BookingRoom {
  id: string;
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
  specialRequests: Nullable<string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingGuest {
  id: string;
  bookingId: string;
  isPrimary: boolean;
  firstName: string;
  lastName: string;
  email: Nullable<string>;
  phone: Nullable<string>;
  nationality: Nullable<string>;
  governmentIdType: Nullable<GovIdType>;
  governmentIdNumber: Nullable<string>;
  dateOfBirth: Nullable<Date>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingAudit {
  id: string;
  bookingId: string;
  eventType: BookingAuditEvent;
  eventDescription: string;
  performedById: string;
  metadata: Nullable<unknown>;
  createdAt: Date;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateBookingRoomInput {
  roomId: string;
  roomTypeId: string;
  checkInDate: Date;
  checkOutDate: Date;
  adultCount: number;
  childCount: number;
  specialRequests?: string;
}

export interface CreateBookingGuestInput {
  isPrimary: boolean;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  nationality?: string;
  governmentIdType?: GovIdType;
  governmentIdNumber?: string;
  dateOfBirth?: Date;
}

export interface CreateBookingInput {
  hotelId: string;
  organizationId: string;
  source: BookingSource;
  currency: string;
  specialRequests?: string;
  internalNotes?: string;
  bookedById: string;
  rooms: CreateBookingRoomInput[];
  guests: CreateBookingGuestInput[];
}

// ─── Full booking with relations ──────────────────────────────────────────────

export interface BookingWithDetails extends Booking {
  rooms: BookingRoom[];
  guests: BookingGuest[];
  audit: BookingAudit[];
}
