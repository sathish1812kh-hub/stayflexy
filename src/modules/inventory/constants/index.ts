// FILE: src/modules/inventory/constants/index.ts
import type { InventoryBlockReason } from "../types";

export const INVENTORY_ERRORS = {
  INSUFFICIENT_AVAILABILITY: "Insufficient inventory availability",
  NEGATIVE_INVENTORY: "Inventory counts cannot be negative",
  EXCEEDS_TOTAL: "Reserved plus blocked inventory cannot exceed total inventory",
  BLOCK_NOT_FOUND: "Inventory block not found",
  INVENTORY_NOT_FOUND: "Inventory record not found",
  DATE_RANGE_INVALID: "End date must be on or after start date",
  MAX_BLOCK_DAYS_EXCEEDED: "Date range exceeds the maximum allowed block days",
} as const;

export const BLOCK_REASONS: InventoryBlockReason[] = [
  "MAINTENANCE",
  "OTA_BLOCK",
  "MANUAL_BLOCK",
  "HOTEL_USE",
  "RENOVATION",
  "VIP_HOLD",
  "CONTINGENCY",
];

export const MAX_INVENTORY_BLOCK_DAYS = 365;
export const MAX_INVENTORY_QUANTITY = 9999;
export const MAX_DATE_RANGE_DAYS = 90;
export const DEFAULT_INVENTORY_COUNT = 0;
