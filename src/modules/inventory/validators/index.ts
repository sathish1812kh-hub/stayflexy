// FILE: src/modules/inventory/validators/index.ts
import { ZodError } from "zod";
import { ValidationError, BadRequestError } from "@errors/HttpError";
import {
  InventoryQueryDto,
  SetInventoryDto,
  BulkSetInventoryDto,
  BlockInventoryDto,
  BulkBlockInventoryDto,
  UnblockInventoryDto,
  AvailabilityQueryDto,
  type InventoryQueryDtoType,
  type SetInventoryDtoType,
  type BulkSetInventoryDtoType,
  type BlockInventoryDtoType,
  type BulkBlockInventoryDtoType,
  type UnblockInventoryDtoType,
  type AvailabilityQueryDtoType,
} from "../dto";

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

/**
 * Parses a "YYYY-MM-DD" string to a Date object at midnight UTC.
 * Throws BadRequestError if the string is not a valid calendar date.
 */
export function parseInventoryDate(dateStr: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new BadRequestError(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD.`);
  }
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(d.getTime())) {
    throw new BadRequestError(`Invalid date: "${dateStr}".`);
  }
  return d;
}

export function validateInventoryQuery(data: unknown): InventoryQueryDtoType {
  return parseOrThrow(InventoryQueryDto, data);
}

export function validateSetInventory(data: unknown): SetInventoryDtoType {
  return parseOrThrow(SetInventoryDto, data);
}

export function validateBulkSetInventory(data: unknown): BulkSetInventoryDtoType {
  return parseOrThrow(BulkSetInventoryDto, data);
}

export function validateBlockInventory(data: unknown): BlockInventoryDtoType {
  return parseOrThrow(BlockInventoryDto, data);
}

export function validateBulkBlockInventory(data: unknown): BulkBlockInventoryDtoType {
  return parseOrThrow(BulkBlockInventoryDto, data);
}

export function validateUnblockInventory(data: unknown): UnblockInventoryDtoType {
  return parseOrThrow(UnblockInventoryDto, data);
}

export function validateAvailabilityQuery(data: unknown): AvailabilityQueryDtoType {
  return parseOrThrow(AvailabilityQueryDto, data);
}
