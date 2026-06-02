// FILE: src/modules/inventory/dto/index.ts
import { z } from "zod";
import { MAX_DATE_RANGE_DAYS, MAX_INVENTORY_BLOCK_DAYS, MAX_INVENTORY_QUANTITY } from "../constants";

// ─── Shared helpers ────────────────────────────────────────────────────────────

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const blockReasonEnum = z.enum([
  "MAINTENANCE",
  "OTA_BLOCK",
  "MANUAL_BLOCK",
  "HOTEL_USE",
  "RENOVATION",
  "VIP_HOLD",
  "CONTINGENCY",
]);

// ─── InventoryQueryDto ─────────────────────────────────────────────────────────

export const InventoryQueryDto = z
  .object({
    hotelId: z.string().uuid("hotelId must be a valid UUID"),
    roomTypeId: z.string().uuid("roomTypeId must be a valid UUID").optional(),
    startDate: dateString,
    endDate: dateString,
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be on or after startDate",
        path: ["endDate"],
      });
      return;
    }
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > MAX_DATE_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
        path: ["endDate"],
      });
    }
  });

// ─── SetInventoryDto ───────────────────────────────────────────────────────────

export const SetInventoryDto = z.object({
  hotelId: z.string().uuid("hotelId must be a valid UUID"),
  roomTypeId: z.string().uuid("roomTypeId must be a valid UUID"),
  date: dateString,
  totalInventory: z
    .number()
    .int("totalInventory must be an integer")
    .min(0, "totalInventory must be >= 0")
    .max(MAX_INVENTORY_QUANTITY, `totalInventory must be <= ${MAX_INVENTORY_QUANTITY}`),
});

// ─── BulkSetInventoryDto ───────────────────────────────────────────────────────

export const BulkSetInventoryDto = z
  .object({
    roomTypeId: z.string().uuid("roomTypeId must be a valid UUID"),
    hotelId: z.string().uuid("hotelId must be a valid UUID"),
    startDate: dateString,
    endDate: dateString,
    totalInventory: z
      .number()
      .int("totalInventory must be an integer")
      .min(0, "totalInventory must be >= 0")
      .max(MAX_INVENTORY_QUANTITY, `totalInventory must be <= ${MAX_INVENTORY_QUANTITY}`),
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be on or after startDate",
        path: ["endDate"],
      });
      return;
    }
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > MAX_INVENTORY_BLOCK_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Date range cannot exceed ${MAX_INVENTORY_BLOCK_DAYS} days`,
        path: ["endDate"],
      });
    }
  });

// ─── BlockInventoryDto ─────────────────────────────────────────────────────────

export const BlockInventoryDto = z.object({
  hotelId: z.string().uuid("hotelId must be a valid UUID"),
  roomTypeId: z.string().uuid("roomTypeId must be a valid UUID"),
  date: dateString,
  quantity: z
    .number()
    .int("quantity must be an integer")
    .min(1, "quantity must be >= 1")
    .max(MAX_INVENTORY_QUANTITY, `quantity must be <= ${MAX_INVENTORY_QUANTITY}`),
  reason: blockReasonEnum,
  notes: z.string().max(500, "notes must be <= 500 characters").optional(),
});

// ─── BulkBlockInventoryDto ────────────────────────────────────────────────────

export const BulkBlockInventoryDto = z
  .object({
    hotelId: z.string().uuid("hotelId must be a valid UUID"),
    roomTypeId: z.string().uuid("roomTypeId must be a valid UUID"),
    startDate: dateString,
    endDate: dateString,
    quantity: z
      .number()
      .int("quantity must be an integer")
      .min(1, "quantity must be >= 1")
      .max(MAX_INVENTORY_QUANTITY, `quantity must be <= ${MAX_INVENTORY_QUANTITY}`),
    reason: blockReasonEnum,
    notes: z.string().max(500, "notes must be <= 500 characters").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be on or after startDate",
        path: ["endDate"],
      });
      return;
    }
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > MAX_INVENTORY_BLOCK_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Date range cannot exceed ${MAX_INVENTORY_BLOCK_DAYS} days`,
        path: ["endDate"],
      });
    }
  });

// ─── UnblockInventoryDto ──────────────────────────────────────────────────────

export const UnblockInventoryDto = z.object({
  blockId: z.string().uuid("blockId must be a valid UUID"),
  reason: z.string().max(500, "reason must be <= 500 characters").optional(),
});

// ─── AvailabilityQueryDto ─────────────────────────────────────────────────────

export const AvailabilityQueryDto = z
  .object({
    hotelId: z.string().uuid("hotelId must be a valid UUID"),
    roomTypeId: z.string().uuid("roomTypeId must be a valid UUID").optional(),
    startDate: dateString,
    endDate: dateString,
    minAvailable: z.coerce.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be on or after startDate",
        path: ["endDate"],
      });
      return;
    }
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > MAX_DATE_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
        path: ["endDate"],
      });
    }
  });

// ─── Inferred types ───────────────────────────────────────────────────────────

export type InventoryQueryDtoType = z.infer<typeof InventoryQueryDto>;
export type SetInventoryDtoType = z.infer<typeof SetInventoryDto>;
export type BulkSetInventoryDtoType = z.infer<typeof BulkSetInventoryDto>;
export type BlockInventoryDtoType = z.infer<typeof BlockInventoryDto>;
export type BulkBlockInventoryDtoType = z.infer<typeof BulkBlockInventoryDto>;
export type UnblockInventoryDtoType = z.infer<typeof UnblockInventoryDto>;
export type AvailabilityQueryDtoType = z.infer<typeof AvailabilityQueryDto>;
