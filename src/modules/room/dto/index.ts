// FILE: src/modules/room/dto/index.ts
import { z } from "zod";
import {
  BED_TYPES,
  ROOM_OPERATIONAL_STATUSES,
  HOUSEKEEPING_STATUSES,
  OCCUPANCY_STATUSES,
  MAX_FLOOR,
  MIN_BASE_PRICE,
  MAX_BASE_PRICE,
  MAX_ROOM_NUMBER_LENGTH,
} from "../constants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const bedTypeEnum = BED_TYPES as [string, ...string[]];
const operationalStatusEnum = ROOM_OPERATIONAL_STATUSES as [string, ...string[]];
const housekeepingStatusEnum = HOUSEKEEPING_STATUSES as [string, ...string[]];

// ─── RoomType DTOs ────────────────────────────────────────────────────────────

export const CreateRoomTypeDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters")
    .trim(),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80, "Slug must not exceed 80 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens")
    .optional(),
  description: z
    .string()
    .max(5000, "Description must not exceed 5000 characters")
    .optional()
    .nullable(),
  maxAdults: z
    .number()
    .int("maxAdults must be a whole number")
    .min(1, "maxAdults must be at least 1")
    .max(20, "maxAdults cannot exceed 20"),
  maxChildren: z
    .number()
    .int("maxChildren must be a whole number")
    .min(0, "maxChildren cannot be negative")
    .max(20, "maxChildren cannot exceed 20"),
  maxOccupancy: z
    .number()
    .int("maxOccupancy must be a whole number")
    .min(1, "maxOccupancy must be at least 1")
    .max(40, "maxOccupancy cannot exceed 40"),
  basePrice: z
    .number()
    .min(MIN_BASE_PRICE, `basePrice must be at least ${MIN_BASE_PRICE}`)
    .max(MAX_BASE_PRICE, `basePrice cannot exceed ${MAX_BASE_PRICE}`),
  sizeM2: z
    .number()
    .positive("sizeM2 must be a positive number")
    .optional()
    .nullable(),
  bedType: z.enum(bedTypeEnum as [string, ...string[]]),
  amenities: z.array(z.string().min(1)).optional().default([]),
});

export const UpdateRoomTypeDto = CreateRoomTypeDto
  .omit({ hotelId: true })
  .extend({ status: z.enum(["ACTIVE", "INACTIVE"]).optional() })
  .partial();

export const RoomTypeFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const UpdateRoomTypeStatusDto = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

// ─── Room DTOs ────────────────────────────────────────────────────────────────

const ROOM_NUMBER_REGEX = /^[A-Z0-9-]+$/i;

export const CreateRoomDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  roomTypeId: z.string().uuid("Invalid room type ID"),
  roomNumber: z
    .string()
    .min(1, "Room number is required")
    .max(MAX_ROOM_NUMBER_LENGTH, `Room number must not exceed ${MAX_ROOM_NUMBER_LENGTH} characters`)
    .regex(ROOM_NUMBER_REGEX, "Room number may only contain letters, numbers, and hyphens")
    .trim(),
  floor: z
    .number()
    .int("Floor must be a whole number")
    .min(1, "Floor must be at least 1")
    .max(MAX_FLOOR, `Floor cannot exceed ${MAX_FLOOR}`),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional()
    .nullable(),
  view: z
    .string()
    .max(100, "View must not exceed 100 characters")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, "Notes must not exceed 1000 characters")
    .optional()
    .nullable(),
});

export const UpdateRoomDto = CreateRoomDto.omit({ hotelId: true, roomTypeId: true }).partial();

export const UpdateRoomStatusDto = z.object({
  operationalStatus: z.enum(operationalStatusEnum as [string, ...string[]]),
  reason: z.string().max(500, "Reason must not exceed 500 characters").optional(),
});

export const UpdateHousekeepingStatusDto = z.object({
  housekeepingStatus: z.enum(housekeepingStatusEnum as [string, ...string[]]),
  notes: z.string().max(1000, "Notes must not exceed 1000 characters").optional(),
});

export const RoomFilterDto = z.object({
  hotelId: z.string().uuid("Invalid hotel ID"),
  roomTypeId: z.string().uuid("Invalid room type ID").optional(),
  operationalStatus: z.enum(operationalStatusEnum as [string, ...string[]]).optional(),
  housekeepingStatus: z.enum(housekeepingStatusEnum as [string, ...string[]]).optional(),
  occupancyStatus: z
    .enum(OCCUPANCY_STATUSES as [string, ...string[]])
    .optional(),
  floor: z.coerce.number().int().min(1).max(MAX_FLOOR).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateRoomTypeDtoType = z.infer<typeof CreateRoomTypeDto>;
export type UpdateRoomTypeDtoType = z.infer<typeof UpdateRoomTypeDto>;
export type RoomTypeFilterDtoType = z.infer<typeof RoomTypeFilterDto>;
export type UpdateRoomTypeStatusDtoType = z.infer<typeof UpdateRoomTypeStatusDto>;

export type CreateRoomDtoType = z.infer<typeof CreateRoomDto>;
export type UpdateRoomDtoType = z.infer<typeof UpdateRoomDto>;
export type UpdateRoomStatusDtoType = z.infer<typeof UpdateRoomStatusDto>;
export type UpdateHousekeepingStatusDtoType = z.infer<typeof UpdateHousekeepingStatusDto>;
export type RoomFilterDtoType = z.infer<typeof RoomFilterDto>;
