// FILE: src/modules/inventory/services/InventoryService.ts
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "@errors/HttpError";
import type {
  Inventory,
  InventoryBlock,
  AvailabilityResult,
  DateRangeAvailability,
} from "../types";
import type { InventoryRepository, InventoryBlockRepository } from "../repositories";
import type {
  SetInventoryDtoType,
  BulkSetInventoryDtoType,
  BlockInventoryDtoType,
  BulkBlockInventoryDtoType,
  UnblockInventoryDtoType,
  AvailabilityQueryDtoType,
  InventoryQueryDtoType,
} from "../dto";
import {
  INVENTORY_ERRORS,
  MAX_INVENTORY_BLOCK_DAYS,
  DEFAULT_INVENTORY_COUNT,
} from "../constants";
import { parseInventoryDate } from "../validators";

export class InventoryService extends BaseService {
  protected readonly moduleName = "InventoryService";

  constructor(
    private readonly inventoryRepo: InventoryRepository,
    private readonly blockRepo: InventoryBlockRepository
  ) {
    super();
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async validateHotelBelongsToOrg(hotelId: string, orgId: string): Promise<void> {
    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!hotel) {
      throw new ForbiddenError(
        "Hotel not found or does not belong to your organization"
      );
    }
  }

  private generateDateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    let count = 0;
    while (current <= end && count < MAX_INVENTORY_BLOCK_DAYS) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
      count++;
    }
    return dates;
  }

  private computeAvailabilityResult(
    roomTypeId: string,
    date: Date,
    inventory: Inventory | null
  ): AvailabilityResult {
    if (!inventory) {
      return {
        roomTypeId,
        date,
        totalInventory: DEFAULT_INVENTORY_COUNT,
        reservedInventory: DEFAULT_INVENTORY_COUNT,
        blockedInventory: DEFAULT_INVENTORY_COUNT,
        availableInventory: DEFAULT_INVENTORY_COUNT,
        isAvailable: false,
      };
    }
    return {
      roomTypeId: inventory.roomTypeId,
      date: inventory.inventoryDate,
      totalInventory: inventory.totalInventory,
      reservedInventory: inventory.reservedInventory,
      blockedInventory: inventory.blockedInventory,
      availableInventory: inventory.availableInventory,
      isAvailable: inventory.availableInventory > 0,
    };
  }

  // ─── Public service methods ─────────────────────────────────────────────────

  /**
   * Set (upsert) inventory count for a single room type on a specific date.
   */
  async setInventory(dto: SetInventoryDtoType, orgId: string): Promise<Inventory> {
    return this.execute("setInventory", async () => {
      await this.validateHotelBelongsToOrg(dto.hotelId, orgId);
      const date = parseInventoryDate(dto.date);

      const roomType = await prisma.roomType.findFirst({
        where: { id: dto.roomTypeId, hotelId: dto.hotelId, deletedAt: null },
        select: { organizationId: true },
      });
      if (!roomType) {
        throw new NotFoundError("Room type not found for this hotel");
      }

      return this.inventoryRepo.upsertByRoomTypeAndDate(
        dto.roomTypeId,
        dto.hotelId,
        roomType.organizationId,
        date,
        dto.totalInventory
      );
    });
  }

  /**
   * Bulk-set (upsert) inventory for a room type across a date range.
   * Returns the count of records upserted.
   */
  async bulkSetInventory(
    dto: BulkSetInventoryDtoType,
    orgId: string
  ): Promise<{ count: number }> {
    return this.execute("bulkSetInventory", async () => {
      await this.validateHotelBelongsToOrg(dto.hotelId, orgId);

      const roomType = await prisma.roomType.findFirst({
        where: { id: dto.roomTypeId, hotelId: dto.hotelId, deletedAt: null },
        select: { organizationId: true },
      });
      if (!roomType) {
        throw new NotFoundError("Room type not found for this hotel");
      }

      const startDate = parseInventoryDate(dto.startDate);
      const endDate = parseInventoryDate(dto.endDate);
      const dates = this.generateDateRange(startDate, endDate);

      await Promise.all(
        dates.map((date) =>
          this.inventoryRepo.upsertByRoomTypeAndDate(
            dto.roomTypeId,
            dto.hotelId,
            roomType.organizationId,
            date,
            dto.totalInventory
          )
        )
      );

      return { count: dates.length };
    });
  }

  /**
   * Check availability across a date range for a hotel (optionally filtered by roomTypeId).
   * Returns DateRangeAvailability grouped per roomTypeId, or flat AvailabilityResult[] when
   * a single roomTypeId is given. Also filters by minAvailable when provided.
   */
  async checkAvailability(
    dto: AvailabilityQueryDtoType,
    orgId: string
  ): Promise<DateRangeAvailability | AvailabilityResult[]> {
    return this.execute("checkAvailability", async () => {
      await this.validateHotelBelongsToOrg(dto.hotelId, orgId);

      const startDate = parseInventoryDate(dto.startDate);
      const endDate = parseInventoryDate(dto.endDate);

      const records = await this.inventoryRepo.findByHotelAndDateRange(
        dto.hotelId,
        startDate,
        endDate,
        dto.roomTypeId
      );

      const dates = this.generateDateRange(startDate, endDate);

      if (dto.roomTypeId) {
        // Single room type — return DateRangeAvailability
        const byDate = new Map(
          records.map((r) => [r.inventoryDate.toISOString(), r])
        );
        const results: AvailabilityResult[] = dates.map((d) => {
          const inv = byDate.get(d.toISOString()) ?? null;
          return this.computeAvailabilityResult(dto.roomTypeId ?? "", d, inv);
        });

        const filtered =
          dto.minAvailable !== undefined
            ? results.filter((r) => r.availableInventory >= (dto.minAvailable ?? 0))
            : results;

        const minAvailable = filtered.length > 0
          ? Math.min(...filtered.map((r) => r.availableInventory))
          : 0;

        return {
          roomTypeId: dto.roomTypeId,
          hotelId: dto.hotelId,
          startDate,
          endDate,
          dates: filtered,
          minAvailable,
          isFullyAvailable: filtered.length === dates.length && minAvailable > 0,
        } satisfies DateRangeAvailability;
      }

      // No roomTypeId — return flat list of AvailabilityResults across all room types
      const results = records.map((inv) =>
        this.computeAvailabilityResult(inv.roomTypeId, inv.inventoryDate, inv)
      );

      const filtered =
        dto.minAvailable !== undefined
          ? results.filter((r) => r.availableInventory >= (dto.minAvailable ?? 0))
          : results;

      return filtered;
    });
  }

  /**
   * Check whether a specific room type has at least `quantity` available units
   * on a given date. Does NOT validate org access — intended for internal use
   * (e.g. booking service).
   */
  async checkSingleDateAvailability(
    roomTypeId: string,
    date: Date,
    quantity: number
  ): Promise<boolean> {
    return this.execute("checkSingleDateAvailability", async () => {
      const inv = await this.inventoryRepo.findByRoomTypeAndDate(roomTypeId, date);
      if (!inv) return false;
      return inv.availableInventory >= quantity;
    });
  }

  /**
   * Block inventory for a single date.
   * Runs the upsert + availability check + adjust + block-record creation inside a $transaction.
   */
  async blockInventory(
    dto: BlockInventoryDtoType,
    orgId: string,
    blockedById: string
  ): Promise<InventoryBlock> {
    return this.execute("blockInventory", async () => {
      await this.validateHotelBelongsToOrg(dto.hotelId, orgId);

      const roomType = await prisma.roomType.findFirst({
        where: { id: dto.roomTypeId, hotelId: dto.hotelId, deletedAt: null },
        select: { organizationId: true },
      });
      if (!roomType) {
        throw new NotFoundError("Room type not found for this hotel");
      }

      const date = parseInventoryDate(dto.date);

      // 1. Find or create the inventory record (without resetting totalInventory)
      //    We look up first; if not found, create with DEFAULT_INVENTORY_COUNT.
      let invRecord = await this.inventoryRepo.findByRoomTypeAndDate(dto.roomTypeId, date);
      if (!invRecord) {
        invRecord = await this.inventoryRepo.upsertByRoomTypeAndDate(
          dto.roomTypeId,
          dto.hotelId,
          roomType.organizationId,
          date,
          DEFAULT_INVENTORY_COUNT
        );
      }
      const inventoryId = invRecord.id;

      return prisma.$transaction(async (tx) => {
        // 2. Lock for update (fetch within transaction)
        const locked = await this.inventoryRepo.lockForUpdate(inventoryId, tx);
        if (!locked) {
          throw new NotFoundError(INVENTORY_ERRORS.INVENTORY_NOT_FOUND);
        }

        // 3. Check available capacity
        const available = locked.availableInventory;
        if (dto.quantity > available) {
          throw new ConflictError(INVENTORY_ERRORS.INSUFFICIENT_AVAILABILITY, {
            available,
            requested: dto.quantity,
          });
        }

        // 4. Adjust blocked inventory
        await this.inventoryRepo.adjustBlockedInventory(inventoryId, dto.quantity, tx);

        // 5. Create block record
        const block = await this.blockRepo.create({
          inventoryId,
          hotelId: dto.hotelId,
          reason: dto.reason,
          blockedById,
          quantity: dto.quantity,
          notes: dto.notes ?? null,
          isActive: true,
        });

        return block;
      });
    });
  }

  /**
   * Block inventory across a date range sequentially (to ensure each date's
   * availability check is consistent). Returns array of created blocks.
   */
  async bulkBlockInventory(
    dto: BulkBlockInventoryDtoType,
    orgId: string,
    blockedById: string
  ): Promise<InventoryBlock[]> {
    return this.execute("bulkBlockInventory", async () => {
      const startDate = parseInventoryDate(dto.startDate);
      const endDate = parseInventoryDate(dto.endDate);
      const dates = this.generateDateRange(startDate, endDate);

      const blocks: InventoryBlock[] = [];
      for (const date of dates) {
        const dateStr = date.toISOString().substring(0, 10);
        const singleDto: BlockInventoryDtoType = {
          hotelId: dto.hotelId,
          roomTypeId: dto.roomTypeId,
          date: dateStr,
          quantity: dto.quantity,
          reason: dto.reason,
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        };
        const block = await this.blockInventory(singleDto, orgId, blockedById);
        blocks.push(block);
      }

      return blocks;
    });
  }

  /**
   * Unblock (deactivate) a specific block and restore blocked inventory.
   */
  async unblockInventory(dto: UnblockInventoryDtoType, orgId: string): Promise<Inventory> {
    return this.execute("unblockInventory", async () => {
      const block = await this.blockRepo.findById(dto.blockId);
      if (!block) {
        throw new NotFoundError(INVENTORY_ERRORS.BLOCK_NOT_FOUND);
      }

      // Verify the block's hotel belongs to the caller's org
      await this.validateHotelBelongsToOrg(block.hotelId, orgId);

      if (!block.isActive) {
        throw new ConflictError("Block is already inactive");
      }

      return prisma.$transaction(async (tx) => {
        // Deactivate the block
        await tx.inventoryBlock.update({
          where: { id: block.id },
          data: { isActive: false },
        });

        // Restore the blocked inventory
        const updated = await this.inventoryRepo.adjustBlockedInventory(
          block.inventoryId,
          -block.quantity,
          tx
        );

        return updated;
      });
    });
  }

  /**
   * Fetch all inventory records for a hotel in a date range with computed availableInventory.
   */
  async getInventoryForHotel(
    hotelId: string,
    startDate: Date,
    endDate: Date,
    orgId: string
  ): Promise<Inventory[]> {
    return this.execute("getInventoryForHotel", async () => {
      await this.validateHotelBelongsToOrg(hotelId, orgId);
      return this.inventoryRepo.findByHotelAndDateRange(hotelId, startDate, endDate);
    });
  }

  /**
   * Query inventory with optional roomTypeId filter. Shared by the GET /inventory route.
   */
  async queryInventory(dto: InventoryQueryDtoType, orgId: string): Promise<Inventory[]> {
    return this.execute("queryInventory", async () => {
      await this.validateHotelBelongsToOrg(dto.hotelId, orgId);
      const startDate = parseInventoryDate(dto.startDate);
      const endDate = parseInventoryDate(dto.endDate);
      return this.inventoryRepo.findByHotelAndDateRange(
        dto.hotelId,
        startDate,
        endDate,
        dto.roomTypeId
      );
    });
  }
}
