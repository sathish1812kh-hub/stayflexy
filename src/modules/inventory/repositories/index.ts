// FILE: src/modules/inventory/repositories/index.ts
import { BaseRepository, type PrismaTransactionClient } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  Inventory,
  InventoryBlock,
  CreateInventoryData,
  UpdateInventoryData,
  CreateInventoryBlockData,
  UpdateInventoryBlockData,
} from "../types";

// ─── InventoryRepository ───────────────────────────────────────────────────────

export abstract class InventoryRepository extends BaseRepository<
  Inventory,
  CreateInventoryData,
  UpdateInventoryData
> {
  abstract override findById(id: string): Promise<Nullable<Inventory>>;

  abstract override findMany(params: PaginationParams): Promise<PaginatedResult<Inventory>>;

  abstract override create(data: CreateInventoryData): Promise<Inventory>;

  abstract override update(id: string, data: UpdateInventoryData): Promise<Inventory>;

  abstract override hardDelete(id: string): Promise<void>;

  /** Find a single inventory record by room type and specific date */
  abstract findByRoomTypeAndDate(
    roomTypeId: string,
    date: Date
  ): Promise<Nullable<Inventory>>;

  /** Find all inventory records for a hotel between startDate and endDate (inclusive) */
  abstract findByHotelAndDateRange(
    hotelId: string,
    startDate: Date,
    endDate: Date,
    roomTypeId?: string
  ): Promise<Inventory[]>;

  /**
   * Upsert an inventory record keyed on (roomTypeId, inventoryDate).
   * Creates if not exists; updates totalInventory if exists.
   */
  abstract upsertByRoomTypeAndDate(
    roomTypeId: string,
    hotelId: string,
    orgId: string,
    date: Date,
    totalInventory: number
  ): Promise<Inventory>;

  /**
   * Atomically adjust reservedInventory by delta (can be negative for release).
   * Verifies post-update invariants and throws ConflictError if violated.
   */
  abstract adjustReservedInventory(
    id: string,
    delta: number,
    tx?: PrismaTransactionClient
  ): Promise<Inventory>;

  /**
   * Atomically adjust blockedInventory by delta (can be negative for unblock).
   * Verifies post-update invariants and throws ConflictError if violated.
   */
  abstract adjustBlockedInventory(
    id: string,
    delta: number,
    tx?: PrismaTransactionClient
  ): Promise<Inventory>;

  /**
   * Fetch record within a transaction for pessimistic locking preparation.
   * Actual SELECT FOR UPDATE via raw SQL when needed; for now fetches within tx.
   */
  abstract lockForUpdate(id: string, tx: PrismaTransactionClient): Promise<Nullable<Inventory>>;
}

// ─── InventoryBlockRepository ──────────────────────────────────────────────────

export abstract class InventoryBlockRepository extends BaseRepository<
  InventoryBlock,
  CreateInventoryBlockData,
  UpdateInventoryBlockData
> {
  abstract override findById(id: string): Promise<Nullable<InventoryBlock>>;

  abstract override findMany(params: PaginationParams): Promise<PaginatedResult<InventoryBlock>>;

  abstract override create(data: CreateInventoryBlockData): Promise<InventoryBlock>;

  abstract override update(id: string, data: UpdateInventoryBlockData): Promise<InventoryBlock>;

  abstract override hardDelete(id: string): Promise<void>;

  /** Find all active blocks for a given inventory record */
  abstract findActiveByInventory(inventoryId: string): Promise<InventoryBlock[]>;

  /** Find all blocks for a hotel within a date range (via inventory join) */
  abstract findByHotelAndDateRange(
    hotelId: string,
    startDate: Date,
    endDate: Date
  ): Promise<InventoryBlock[]>;

  /** Soft-deactivate a single block (isActive = false) */
  abstract deactivate(id: string): Promise<InventoryBlock>;

  /** Deactivate all active blocks for an inventory record */
  abstract deactivateByInventory(inventoryId: string): Promise<void>;

  /** Count active blocks for an inventory record */
  abstract countActiveByInventory(inventoryId: string): Promise<number>;
}
