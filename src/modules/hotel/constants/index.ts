// FILE: src/modules/hotel/constants/index.ts
import type { HotelCategory, HotelStatus, HotelOperationalStatus } from "../types";

export const HOTEL_ERRORS = {
  NOT_FOUND: "Hotel not found",
  SLUG_TAKEN: "A hotel with this slug already exists in your organization",
  CODE_TAKEN: "A hotel with this code already exists in your organization",
  ORGANIZATION_LIMIT_REACHED: "Organization has reached the maximum number of hotels",
  INVALID_STAR_RATING: "Star rating must be between 1 and 5",
  INVALID_CHECK_TIME: "Check-in/check-out time must be in HH:MM format",
  INVALID_STATUS_TRANSITION: "This status transition is not permitted",
  OWNERSHIP_MISMATCH: "Hotel does not belong to this organization",
  HOTEL_NOT_OPERATIONAL: "Hotel is not currently operational",
  INVALID_TIMEZONE: "Invalid IANA timezone identifier",
  INVALID_CURRENCY: "Unsupported currency code",
} as const;

export const HOTEL_CATEGORIES: HotelCategory[] = [
  "HOTEL", "RESORT", "BOUTIQUE", "HOSTEL", "MOTEL",
  "BED_AND_BREAKFAST", "SERVICED_APARTMENT", "VILLA", "LODGE",
  "BUDGET", "ECONOMY", "MIDSCALE", "UPSCALE", "LUXURY",
];

export const HOTEL_STATUSES: HotelStatus[] = [
  "ACTIVE", "INACTIVE", "UNDER_MAINTENANCE", "CLOSED",
];

export const OPERATIONAL_STATUS_VALUES: HotelOperationalStatus[] = [
  "OPEN", "CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY", "UNDER_RENOVATION", "PRE_OPENING",
];

export const VALID_CURRENCIES: string[] = [
  "USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD",
  "JPY", "THB", "MYR", "IDR", "PHP", "HKD", "CHF",
];

export const DEFAULT_CHECK_IN_TIME = "14:00";
export const DEFAULT_CHECK_OUT_TIME = "11:00";
export const DEFAULT_CURRENCY = "USD";
export const DEFAULT_TIMEZONE = "UTC";

export const MAX_HOTELS_PER_ORGANIZATION = 50;
export const MIN_STAR_RATING = 1;
export const MAX_STAR_RATING = 5;
export const HOTEL_SLUG_MAX_LENGTH = 64;
export const HOTEL_NAME_MAX_LENGTH = 200;
export const HOTEL_CODE_MAX_LENGTH = 20;
export const HOTEL_PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;
export const HOTEL_TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const HOTEL_CODE_REGEX = /^[A-Z0-9-]+$/;

export const OPERATIONAL_STATUSES: HotelOperationalStatus[] = ["OPEN"];
