// FILE: src/modules/hotel/dto/index.ts
import { z } from "zod";
import type { HotelStatus, HotelCategory, HotelOperationalStatus } from "../types";
import {
  HOTEL_CATEGORIES, HOTEL_STATUSES, VALID_CURRENCIES,
  OPERATIONAL_STATUS_VALUES, MIN_STAR_RATING, MAX_STAR_RATING,
  HOTEL_NAME_MAX_LENGTH, HOTEL_SLUG_MAX_LENGTH, HOTEL_TIME_REGEX,
  HOTEL_CODE_MAX_LENGTH, HOTEL_CODE_REGEX,
} from "../constants";

type HotelStatusTuple = [HotelStatus, ...HotelStatus[]];
type HotelCategoryTuple = [HotelCategory, ...HotelCategory[]];
type OpStatusTuple = [HotelOperationalStatus, ...HotelOperationalStatus[]];
type CurrencyTuple = [string, ...string[]];

export const CreateHotelDto = z.object({
  name: z.string().min(1).max(HOTEL_NAME_MAX_LENGTH).trim(),
  slug: z
    .string()
    .min(1)
    .max(HOTEL_SLUG_MAX_LENGTH)
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens")
    .optional(),
  hotelCode: z
    .string()
    .min(1)
    .max(HOTEL_CODE_MAX_LENGTH)
    .toUpperCase()
    .regex(HOTEL_CODE_REGEX, "Hotel code may only contain uppercase letters, numbers, and hyphens")
    .optional(),
  category: z.enum(HOTEL_CATEGORIES as unknown as HotelCategoryTuple),
  starRating: z.number().int().min(MIN_STAR_RATING).max(MAX_STAR_RATING).default(3),
  email: z.string().email().toLowerCase(),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone format"),
  website: z.string().url().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  timezone: z.string().default("UTC"),
  currency: z
    .enum(VALID_CURRENCIES as unknown as CurrencyTuple)
    .default("USD"),
  operationalStatus: z
    .enum(OPERATIONAL_STATUS_VALUES as unknown as OpStatusTuple)
    .default("PRE_OPENING"),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).nullable().optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).nullable().optional(),
  country: z.string().length(2, "Country must be ISO 2-letter code").toUpperCase(),
  postalCode: z.string().max(20).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  checkInTime: z.string().regex(HOTEL_TIME_REGEX, "Must be HH:MM format").default("14:00"),
  checkOutTime: z.string().regex(HOTEL_TIME_REGEX, "Must be HH:MM format").default("11:00"),
  totalRooms: z.number().int().min(1).max(10000).default(1),
  amenities: z.array(z.string().min(1)).default([]),
});

export const UpdateHotelDto = CreateHotelDto.partial().omit({ currency: true });

export const HotelFilterDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(HOTEL_STATUSES as unknown as HotelStatusTuple).optional(),
  category: z.enum(HOTEL_CATEGORIES as unknown as HotelCategoryTuple).optional(),
  search: z.string().max(200).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  minStarRating: z.coerce.number().min(1).max(5).optional(),
  maxStarRating: z.coerce.number().min(1).max(5).optional(),
});

export const UpdateHotelStatusDto = z.object({
  status: z.enum(HOTEL_STATUSES as unknown as HotelStatusTuple),
  reason: z.string().max(500).optional(),
});

export const UpdateHotelOperationalStatusDto = z.object({
  operationalStatus: z.enum(OPERATIONAL_STATUS_VALUES as unknown as OpStatusTuple),
  reason: z.string().max(500).optional(),
});

export const HotelSettingsDto = z.object({
  timezone: z.string().optional(),
  currency: z.enum(VALID_CURRENCIES as unknown as CurrencyTuple).optional(),
  checkInTime: z.string().regex(HOTEL_TIME_REGEX).optional(),
  checkOutTime: z.string().regex(HOTEL_TIME_REGEX).optional(),
  amenities: z.array(z.string()).optional(),
});

export type CreateHotelDtoType = z.infer<typeof CreateHotelDto>;
export type UpdateHotelDtoType = z.infer<typeof UpdateHotelDto>;
export type HotelFilterDtoType = z.infer<typeof HotelFilterDto>;
export type UpdateHotelStatusDtoType = z.infer<typeof UpdateHotelStatusDto>;
export type UpdateHotelOperationalStatusDtoType = z.infer<typeof UpdateHotelOperationalStatusDto>;
export type HotelSettingsDtoType = z.infer<typeof HotelSettingsDto>;
