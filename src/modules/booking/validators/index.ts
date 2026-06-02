// FILE: src/modules/booking/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateBookingDto,
  UpdateBookingDto,
  CancelBookingDto,
  CheckInDto,
  CheckOutDto,
  BookingFilterDto,
  AvailabilitySearchDto,
  type CreateBookingDtoType,
  type UpdateBookingDtoType,
  type CancelBookingDtoType,
  type CheckInDtoType,
  type CheckOutDtoType,
  type BookingFilterDtoType,
  type AvailabilitySearchDtoType,
} from "../dto";

function wrapZod<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({ field: e.path.join("."), message: e.message }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

export function validateCreateBooking(data: unknown): CreateBookingDtoType {
  return wrapZod(() => CreateBookingDto.parse(data)) as CreateBookingDtoType;
}

export function validateUpdateBooking(data: unknown): UpdateBookingDtoType {
  return wrapZod(() => UpdateBookingDto.parse(data)) as UpdateBookingDtoType;
}

export function validateCancelBooking(data: unknown): CancelBookingDtoType {
  return wrapZod(() => CancelBookingDto.parse(data)) as CancelBookingDtoType;
}

export function validateCheckIn(data: unknown): CheckInDtoType {
  return wrapZod(() => CheckInDto.parse(data)) as CheckInDtoType;
}

export function validateCheckOut(data: unknown): CheckOutDtoType {
  return wrapZod(() => CheckOutDto.parse(data)) as CheckOutDtoType;
}

export function validateBookingFilter(data: unknown): BookingFilterDtoType {
  return wrapZod(() => BookingFilterDto.parse(data)) as BookingFilterDtoType;
}

export function validateAvailabilitySearch(data: unknown): AvailabilitySearchDtoType {
  return wrapZod(() => AvailabilitySearchDto.parse(data)) as AvailabilitySearchDtoType;
}

export function parseBookingDate(s: string): Date {
  const d = new Date(s + "T00:00:00.000Z");
  if (isNaN(d.getTime())) {
    throw new ValidationError("Invalid date format", [{ field: "date", message: "Invalid date string" }]);
  }
  return d;
}
