// FILE: src/modules/organization/constants/index.ts
import type { OrgPlan, OrgStatus, OrgSettings } from "../types";

export const ORG_ERRORS = {
  NOT_FOUND: "Organization not found",
  SLUG_TAKEN: "An organization with this slug already exists",
  EMAIL_TAKEN: "An organization with this email already exists",
  HOTEL_LIMIT_REACHED: "Organization has reached its maximum hotel limit for the current plan",
  USER_LIMIT_REACHED: "Organization has reached its maximum user limit for the current plan",
  OWNER_REQUIRED: "Organization must have an owner",
  MEMBER_NOT_FOUND: "Organization member not found",
  MEMBER_ALREADY_EXISTS: "User is already a member of this organization",
  CANNOT_REMOVE_OWNER: "Cannot remove the organization owner",
  INVALID_SLUG: "Slug must contain only lowercase letters, numbers, and hyphens",
  SLUG_TOO_LONG: "Slug must not exceed 64 characters",
  SUSPENDED: "Organization is suspended",
  CANCELLED: "Organization has been cancelled",
} as const;

export const ORG_PLANS: OrgPlan[] = [
  "FREE",
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
];

export const ORG_STATUSES: OrgStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "CANCELLED",
  "PENDING_SETUP",
];

export const PLAN_HOTEL_LIMITS: Record<OrgPlan, number> = {
  FREE: 1,
  STARTER: 5,
  PROFESSIONAL: 20,
  ENTERPRISE: 50,
};

export const PLAN_USER_LIMITS: Record<OrgPlan, number> = {
  FREE: 5,
  STARTER: 20,
  PROFESSIONAL: 100,
  ENTERPRISE: 500,
};

export const SLUG_REGEX = /^[a-z0-9-]+$/;

export const MAX_SLUG_LENGTH = 64;

export const MAX_ORG_NAME_LENGTH = 200;

export const SYSTEM_ORG_ADMIN_ROLE_NAME = "Organization Admin";

export const VALID_TIMEZONES: string[] = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Buenos_Aires",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "Africa/Johannesburg",
];

export const VALID_CURRENCIES: string[] = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "INR",
  "MXN",
  "BRL",
  "SGD",
  "AED",
  "ZAR",
  "KRW",
  "NOK",
  "SEK",
  "DKK",
];

export const ORG_SETTINGS_DEFAULTS: OrgSettings = {
  timezone: "America/New_York",
  currency: "USD",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  language: "en",
  checkInTime: "15:00",
  checkOutTime: "11:00",
};
