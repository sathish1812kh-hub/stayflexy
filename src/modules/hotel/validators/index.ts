// FILE: src/modules/hotel/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateHotelDto, UpdateHotelDto, HotelFilterDto,
  UpdateHotelStatusDto, UpdateHotelOperationalStatusDto, HotelSettingsDto,
} from "../dto";
import type {
  CreateHotelDtoType, UpdateHotelDtoType, HotelFilterDtoType,
  UpdateHotelStatusDtoType, UpdateHotelOperationalStatusDtoType, HotelSettingsDtoType,
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

export function validateCreateHotel(data: unknown): CreateHotelDtoType {
  return wrapZod(() => CreateHotelDto.parse(data)) as CreateHotelDtoType;
}

export function validateUpdateHotel(data: unknown): UpdateHotelDtoType {
  return wrapZod(() => UpdateHotelDto.parse(data)) as UpdateHotelDtoType;
}

export function validateHotelFilter(data: unknown): HotelFilterDtoType {
  return wrapZod(() => HotelFilterDto.parse(data)) as HotelFilterDtoType;
}

export function validateHotelStatus(data: unknown): UpdateHotelStatusDtoType {
  return wrapZod(() => UpdateHotelStatusDto.parse(data)) as UpdateHotelStatusDtoType;
}

export function validateHotelOperationalStatus(data: unknown): UpdateHotelOperationalStatusDtoType {
  return wrapZod(() => UpdateHotelOperationalStatusDto.parse(data)) as UpdateHotelOperationalStatusDtoType;
}

export function validateHotelSettings(data: unknown): HotelSettingsDtoType {
  return wrapZod(() => HotelSettingsDto.parse(data)) as HotelSettingsDtoType;
}

export function validateTimezone(tz: string): boolean {
  try {
    return Intl.supportedValuesOf("timeZone").includes(tz);
  } catch {
    return false;
  }
}
