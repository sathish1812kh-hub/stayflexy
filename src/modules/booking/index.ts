// FILE: src/modules/booking/index.ts

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Booking,
  BookingRoom,
  BookingGuest,
  BookingAudit,
  BookingWithDetails,
  BookingStatus,
  BookingSource,
  CancellationReason,
  GovIdType,
  BookingAuditEvent,
  BookingRoomStatus,
  CreateBookingRoomInput,
  CreateBookingGuestInput,
  CreateBookingInput,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  BOOKING_ERRORS,
  TAX_RATE_DEFAULT,
  BOOKING_NUMBER_PREFIX,
  MAX_ROOMS_PER_BOOKING,
  MAX_GUESTS_PER_BOOKING,
  MAX_ADVANCE_BOOKING_DAYS,
  MIN_STAY_NIGHTS,
  MAX_STAY_NIGHTS,
  VALID_TRANSITIONS,
} from "./constants";

// ─── Utils ────────────────────────────────────────────────────────────────────
export {
  generateBookingNumber,
  calculateNightCount,
  generateDateRange,
  isValidTransition,
  calculateRoomAmount,
  toDateOnly,
} from "./utils";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export {
  CreateBookingDto,
  UpdateBookingDto,
  CancelBookingDto,
  CheckInDto,
  CheckOutDto,
  BookingFilterDto,
  AvailabilitySearchDto,
} from "./dto";
export type {
  CreateBookingDtoType,
  UpdateBookingDtoType,
  CancelBookingDtoType,
  CheckInDtoType,
  CheckOutDtoType,
  BookingFilterDtoType,
  AvailabilitySearchDtoType,
} from "./dto";

// ─── Validators ───────────────────────────────────────────────────────────────
export {
  validateCreateBooking,
  validateUpdateBooking,
  validateCancelBooking,
  validateCheckIn,
  validateCheckOut,
  validateBookingFilter,
  validateAvailabilitySearch,
  parseBookingDate,
} from "./validators";

// ─── Repositories ─────────────────────────────────────────────────────────────
export {
  BookingRepository,
  BookingRoomRepository,
  BookingGuestRepository,
  BookingAuditRepository,
} from "./repositories";
export type {
  CreateBookingRoomData,
  CreateBookingGuestData,
  CreateBookingAuditData,
} from "./repositories";

// ─── Concrete repositories ────────────────────────────────────────────────────
export { PrismaBookingRepository } from "./repositories/PrismaBookingRepository";
export { PrismaBookingRoomRepository } from "./repositories/PrismaBookingRoomRepository";
export { PrismaBookingGuestRepository } from "./repositories/PrismaBookingGuestRepository";
export { PrismaBookingAuditRepository } from "./repositories/PrismaBookingAuditRepository";

// ─── Services ─────────────────────────────────────────────────────────────────
export { BookingService } from "./services";
export type { AvailabilityResult } from "./services";

// ─── Controllers ──────────────────────────────────────────────────────────────
export { BookingController } from "./controllers";

// ─── Routes ───────────────────────────────────────────────────────────────────
export { createBookingRoutes } from "./routes";

// ─── Middleware ───────────────────────────────────────────────────────────────
export { withBookingAccess, withBookingHotelAccess } from "./middleware";

// ─── Container ───────────────────────────────────────────────────────────────
export { bookingService } from "./container";
