// FILE: src/modules/inventory/types/index.ts
import type { Nullable, TimestampFields } from "@shared-types";

export type InventoryBlockReason =
  | "MAINTENANCE"
  | "OTA_BLOCK"
  | "MANUAL_BLOCK"
  | "HOTEL_USE"
  | "RENOVATION"
  | "VIP_HOLD"
  | "CONTINGENCY";

export interface Inventory extends TimestampFields {
  id: string;
  hotelId: string;
  organizationId: string;
  roomTypeId: string;
  inventoryDate: Date;
  totalInventory: number;
  reservedInventory: number;
  blockedInventory: number;
  /** Computed field — NOT stored in DB. availableInventory = max(0, total - reserved - blocked) */
  availableInventory: number;
}

export interface InventoryBlock extends TimestampFields {
  id: string;
  inventoryId: string;
  hotelId: string;
  reason: InventoryBlockReason;
  blockedById: string;
  quantity: number;
  notes: Nullable<string>;
  isActive: boolean;
}

export interface AvailabilityResult {
  roomTypeId: string;
  date: Date;
  totalInventory: number;
  reservedInventory: number;
  blockedInventory: number;
  availableInventory: number;
  isAvailable: boolean;
}

export interface DateRangeAvailability {
  roomTypeId: string;
  hotelId: string;
  startDate: Date;
  endDate: Date;
  dates: AvailabilityResult[];
  /** Minimum available across all dates in range */
  minAvailable: number;
  /** true when minAvailable > 0 for every date */
  isFullyAvailable: boolean;
}

export interface CreateInventoryData {
  hotelId: string;
  organizationId: string;
  roomTypeId: string;
  inventoryDate: Date;
  totalInventory: number;
  reservedInventory: number;
  blockedInventory: number;
}

export interface UpdateInventoryData {
  totalInventory?: number;
  reservedInventory?: number;
  blockedInventory?: number;
}

export interface CreateInventoryBlockData {
  inventoryId: string;
  hotelId: string;
  reason: InventoryBlockReason;
  blockedById: string;
  quantity: number;
  notes: Nullable<string>;
  isActive: boolean;
}

export interface UpdateInventoryBlockData {
  isActive?: boolean;
  notes?: Nullable<string>;
}
