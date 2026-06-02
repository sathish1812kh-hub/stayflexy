// FILE: src/modules/booking/utils/index.ts
import { randomBytes } from "crypto";
import { BOOKING_NUMBER_PREFIX, VALID_TRANSITIONS } from "../constants";
import type { BookingStatus } from "../types";

/**
 * Generates a unique booking number in "SFX-YYYYMMDD-XXXXXX" format.
 * The suffix is a 6-character hex string for uniqueness.
 */
export function generateBookingNumber(): string {
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${BOOKING_NUMBER_PREFIX}-${year}${month}${day}-${suffix}`;
}

/**
 * Calculates the number of nights between checkIn and checkOut.
 * Uses Math.ceil so any partial day counts as a full night.
 */
export function calculateNightCount(checkIn: Date, checkOut: Date): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Generates an array of dates from start (inclusive) to end (exclusive).
 * Useful for iterating over each night of a stay.
 */
export function generateDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current < end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Checks whether a status transition from → to is permitted.
 */
export function isValidTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Calculates the total room amount given the per-night rate and number of nights.
 */
export function calculateRoomAmount(roomRate: number, nightCount: number): number {
  return Math.round(roomRate * nightCount * 100) / 100;
}

/**
 * Strips the time component from a Date, returning midnight UTC.
 * Required for @db.Date comparisons in Prisma.
 */
export function toDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}
