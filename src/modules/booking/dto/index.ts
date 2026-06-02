// FILE: src/modules/booking/dto/index.ts
import { z } from "zod";
import {
  MAX_ADVANCE_BOOKING_DAYS,
  MAX_STAY_NIGHTS,
  MAX_ROOMS_PER_BOOKING,
  MAX_GUESTS_PER_BOOKING,
} from "../constants";

// ─── Enum helpers ─────────────────────────────────────────────────────────────

const BookingSourceEnum = z.enum([
  "DIRECT",
  "OTA",
  "WALK_IN",
  "PHONE",
  "EMAIL",
  "AGENT",
  "ONLINE",
]);

const BookingStatusEnum = z.enum([
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
]);

const CancellationReasonEnum = z.enum([
  "GUEST_REQUEST",
  "NO_SHOW",
  "HOTEL_REQUEST",
  "FORCE_MAJEURE",
  "DUPLICATE_BOOKING",
  "OTHER",
]);

const GovIdTypeEnum = z.enum([
  "PASSPORT",
  "NATIONAL_ID",
  "DRIVERS_LICENSE",
  "OTHER",
]);

// ─── Date helper ──────────────────────────────────────────────────────────────

const dateStringSchema = z.string().refine(
  (val) => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  },
  { message: "Invalid date format" }
);

// ─── Room input schema ────────────────────────────────────────────────────────

const createBookingRoomSchema = z
  .object({
    roomId: z.string().uuid("Invalid room ID"),
    roomTypeId: z.string().uuid("Invalid room type ID"),
    checkInDate: dateStringSchema,
    checkOutDate: dateStringSchema,
    adultCount: z
      .number()
      .int()
      .min(1, "At least 1 adult is required")
      .max(20, "Adult count cannot exceed 20"),
    childCount: z
      .number()
      .int()
      .min(0, "Child count cannot be negative")
      .max(20, "Child count cannot exceed 20"),
    specialRequests: z.string().max(2000).optional(),
  })
  .refine(
    (data) => new Date(data.checkOutDate) > new Date(data.checkInDate),
    { message: "Check-out date must be after check-in date", path: ["checkOutDate"] }
  )
  .refine(
    (data) => {
      const nights = Math.ceil(
        (new Date(data.checkOutDate).getTime() - new Date(data.checkInDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return nights <= MAX_STAY_NIGHTS;
    },
    { message: `Maximum stay is ${MAX_STAY_NIGHTS} nights`, path: ["checkOutDate"] }
  )
  .refine(
    (data) => {
      const checkIn = new Date(data.checkInDate);
      const maxDate = new Date();
      maxDate.setUTCDate(maxDate.getUTCDate() + MAX_ADVANCE_BOOKING_DAYS);
      return checkIn <= maxDate;
    },
    {
      message: `Bookings cannot be made more than ${MAX_ADVANCE_BOOKING_DAYS} days in advance`,
      path: ["checkInDate"],
    }
  );

// ─── Guest input schema ───────────────────────────────────────────────────────

const createBookingGuestSchema = z.object({
  isPrimary: z.boolean(),
  firstName: z.string().min(1, "First name is required").max(100).trim(),
  lastName: z.string().min(1, "Last name is required").max(100).trim(),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().min(7).max(20).optional(),
  nationality: z.string().max(100).optional(),
  governmentIdType: GovIdTypeEnum.optional(),
  governmentIdNumber: z.string().max(100).optional(),
  dateOfBirth: dateStringSchema.optional(),
});

// ─── CreateBookingDto ─────────────────────────────────────────────────────────

export const CreateBookingDto = z
  .object({
    hotelId: z.string().uuid("Invalid hotel ID"),
    source: BookingSourceEnum,
    currency: z.string().length(3, "Currency must be a 3-character ISO code"),
    specialRequests: z.string().max(2000).optional(),
    internalNotes: z.string().max(2000).optional(),
    rooms: z
      .array(createBookingRoomSchema)
      .min(1, "At least one room is required")
      .max(MAX_ROOMS_PER_BOOKING, `Booking cannot have more than ${MAX_ROOMS_PER_BOOKING} rooms`),
    guests: z
      .array(createBookingGuestSchema)
      .min(1, "At least one guest is required")
      .max(
        MAX_GUESTS_PER_BOOKING,
        `Booking cannot have more than ${MAX_GUESTS_PER_BOOKING} guests`
      ),
  })
  .refine(
    (data) => data.guests.filter((g) => g.isPrimary).length === 1,
    { message: "Exactly one primary guest is required", path: ["guests"] }
  );

// ─── UpdateBookingDto ─────────────────────────────────────────────────────────

export const UpdateBookingDto = z.object({
  specialRequests: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
});

// ─── CancelBookingDto ─────────────────────────────────────────────────────────

export const CancelBookingDto = z.object({
  reason: CancellationReasonEnum,
  note: z.string().max(1000).optional(),
});

// ─── CheckInDto ───────────────────────────────────────────────────────────────

export const CheckInDto = z.object({
  notes: z.string().max(2000).optional(),
});

// ─── CheckOutDto ──────────────────────────────────────────────────────────────

export const CheckOutDto = z.object({
  notes: z.string().max(2000).optional(),
});

// ─── BookingFilterDto ─────────────────────────────────────────────────────────

export const BookingFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID").optional(),
  status: BookingStatusEnum.optional(),
  source: BookingSourceEnum.optional(),
  checkInFrom: dateStringSchema.optional(),
  checkInTo: dateStringSchema.optional(),
  guestName: z.string().max(200).trim().optional(),
  bookingNumber: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── AvailabilitySearchDto ────────────────────────────────────────────────────

export const AvailabilitySearchDto = z
  .object({
    hotelId: z.string().uuid("Invalid hotel ID"),
    roomTypeId: z.string().uuid("Invalid room type ID").optional(),
    checkInDate: dateStringSchema,
    checkOutDate: dateStringSchema,
    adultCount: z.coerce.number().int().min(1).max(20).default(1),
    childCount: z.coerce.number().int().min(0).max(20).default(0),
  })
  .refine(
    (data) => new Date(data.checkOutDate) > new Date(data.checkInDate),
    { message: "Check-out date must be after check-in date", path: ["checkOutDate"] }
  );

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateBookingDtoType = z.infer<typeof CreateBookingDto>;
export type UpdateBookingDtoType = z.infer<typeof UpdateBookingDto>;
export type CancelBookingDtoType = z.infer<typeof CancelBookingDto>;
export type CheckInDtoType = z.infer<typeof CheckInDto>;
export type CheckOutDtoType = z.infer<typeof CheckOutDto>;
export type BookingFilterDtoType = z.infer<typeof BookingFilterDto>;
export type AvailabilitySearchDtoType = z.infer<typeof AvailabilitySearchDto>;
