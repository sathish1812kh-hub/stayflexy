// FILE: src/modules/booking/constants/index.ts
import type { BookingStatus } from "../types";

export const BOOKING_ERRORS = {
  NOT_FOUND: "Booking not found",
  BOOKING_NUMBER_NOT_FOUND: "No booking found with this booking number",
  ROOM_NOT_AVAILABLE: "Room is not available for the requested dates",
  ROOM_NOT_FOUND: "Room not found or does not belong to this hotel",
  ROOM_NOT_OPERATIONAL: "Room is not available for booking",
  ROOM_OVERLAP: "The room is already booked for one or more of the requested dates",
  HOTEL_NOT_FOUND: "Hotel not found",
  HOTEL_NOT_OPERATIONAL: "Hotel is not currently accepting bookings",
  INVENTORY_NOT_FOUND: "No inventory found for the room type on the requested date",
  NO_AVAILABILITY: "No availability for the room type on one or more requested dates",
  INVALID_DATE_RANGE: "Check-out date must be after check-in date",
  STAY_TOO_SHORT: "Minimum stay is 1 night",
  STAY_TOO_LONG: "Maximum stay is 90 nights",
  ADVANCE_BOOKING_TOO_FAR: "Bookings cannot be made more than 365 days in advance",
  INVALID_STATUS_TRANSITION: "This status transition is not allowed",
  ALREADY_CANCELLED: "Booking is already cancelled",
  ALREADY_CHECKED_IN: "Guest is already checked in",
  ALREADY_CHECKED_OUT: "Guest has already checked out",
  NOT_CONFIRMED: "Booking must be confirmed before check-in",
  NOT_CHECKED_IN: "Guest must be checked in before check-out",
  CANCEL_REASON_REQUIRED: "A cancellation reason is required",
  ACCESS_DENIED: "You do not have access to this booking",
  CHECKIN_DATE_NOT_REACHED: "Check-in date has not been reached yet",
  NO_PRIMARY_GUEST: "Exactly one primary guest is required",
  TOO_MANY_ROOMS: "Booking cannot have more than 10 rooms",
  TOO_MANY_GUESTS: "Booking cannot have more than 20 guests",
} as const;

export const TAX_RATE_DEFAULT = 0.10;
export const BOOKING_NUMBER_PREFIX = "SFX";
export const MAX_ROOMS_PER_BOOKING = 10;
export const MAX_GUESTS_PER_BOOKING = 20;
export const MAX_ADVANCE_BOOKING_DAYS = 365;
export const MIN_STAY_NIGHTS = 1;
export const MAX_STAY_NIGHTS = 90;

export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["CHECKED_OUT"],
  CHECKED_OUT: [],
  CANCELLED: [],
  NO_SHOW: [],
};
