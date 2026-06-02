// FILE: src/modules/room/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateRoomTypeDto,
  UpdateRoomTypeDto,
  RoomTypeFilterDto,
  UpdateRoomTypeStatusDto,
  CreateRoomDto,
  UpdateRoomDto,
  UpdateRoomStatusDto,
  UpdateHousekeepingStatusDto,
  RoomFilterDto,
  type CreateRoomTypeDtoType,
  type UpdateRoomTypeDtoType,
  type RoomTypeFilterDtoType,
  type UpdateRoomTypeStatusDtoType,
  type CreateRoomDtoType,
  type UpdateRoomDtoType,
  type UpdateRoomStatusDtoType,
  type UpdateHousekeepingStatusDtoType,
  type RoomFilterDtoType,
} from "../dto";

// ─── Parse-or-throw helper ────────────────────────────────────────────────────

function parseOrThrow<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

// ─── RoomType validators ──────────────────────────────────────────────────────

export function validateCreateRoomType(data: unknown): CreateRoomTypeDtoType {
  return parseOrThrow(CreateRoomTypeDto, data);
}

export function validateUpdateRoomType(data: unknown): UpdateRoomTypeDtoType {
  return parseOrThrow(UpdateRoomTypeDto, data);
}

export function validateRoomTypeFilter(data: unknown): RoomTypeFilterDtoType {
  return parseOrThrow(RoomTypeFilterDto, data);
}

export function validateUpdateRoomTypeStatus(data: unknown): UpdateRoomTypeStatusDtoType {
  return parseOrThrow(UpdateRoomTypeStatusDto, data);
}

// ─── Room validators ──────────────────────────────────────────────────────────

export function validateCreateRoom(data: unknown): CreateRoomDtoType {
  return parseOrThrow(CreateRoomDto, data);
}

export function validateUpdateRoom(data: unknown): UpdateRoomDtoType {
  return parseOrThrow(UpdateRoomDto, data);
}

export function validateUpdateRoomStatus(data: unknown): UpdateRoomStatusDtoType {
  return parseOrThrow(UpdateRoomStatusDto, data);
}

export function validateUpdateHousekeepingStatus(data: unknown): UpdateHousekeepingStatusDtoType {
  return parseOrThrow(UpdateHousekeepingStatusDto, data);
}

export function validateRoomFilter(data: unknown): RoomFilterDtoType {
  return parseOrThrow(RoomFilterDto, data);
}
