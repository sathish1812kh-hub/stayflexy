// FILE: src/modules/inventory/repositories/PrismaInventoryRepository.ts
import { type Prisma } from "@prisma/client";
import { ConflictError } from "@errors/HttpError";
import { type PrismaTransactionClient } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import { InventoryRepository } from "./index";
import type { Inventory, CreateInventoryData, UpdateInventoryData } from "../types";
import { INVENTORY_ERRORS } from "../constants";

type PrismaInventory = Prisma.InventoryGetPayload<Record<string, never>>;

function toInventory(r: PrismaInventory): Inventory {
  const available = Math.max(
    0,
    r.totalInventory - r.reservedInventory - r.blockedInventory
  );
  return {
    id: r.id,
    hotelId: r.hotelId,
    organizationId: r.organizationId,
    roomTypeId: r.roomTypeId,
    inventoryDate: r.inventoryDate,
    totalInventory: r.totalInventory,
    reservedInventory: r.reservedInventory,
    blockedInventory: r.blockedInventory,
    availableInventory: available,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaInventoryRepository extends InventoryRepository {
  async findById(id: string): Promise<Nullable<Inventory>> {
    const r = await this.db.inventory.findFirst({ where: { id } });
    return r ? toInventory(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<Inventory>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.inventory.findMany({
        skip,
        take: params.limit,
        orderBy: { inventoryDate: "asc" },
      }),
      this.db.inventory.count(),
    ]);
    return {
      data: records.map(toInventory),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async create(data: CreateInventoryData): Promise<Inventory> {
    const r = await this.db.inventory.create({
      data: {
        hotelId: data.hotelId,
        organizationId: data.organizationId,
        roomTypeId: data.roomTypeId,
        inventoryDate: data.inventoryDate,
        totalInventory: data.totalInventory,
        reservedInventory: data.reservedInventory,
        blockedInventory: data.blockedInventory,
      },
    });
    return toInventory(r);
  }

  async update(id: string, data: UpdateInventoryData): Promise<Inventory> {
    const payload: Prisma.InventoryUpdateInput = {};
    if (data.totalInventory !== undefined) payload.totalInventory = data.totalInventory;
    if (data.reservedInventory !== undefined) payload.reservedInventory = data.reservedInventory;
    if (data.blockedInventory !== undefined) payload.blockedInventory = data.blockedInventory;
    const r = await this.db.inventory.update({ where: { id }, data: payload });
    return toInventory(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.inventory.delete({ where: { id } });
  }

  async findByRoomTypeAndDate(roomTypeId: string, date: Date): Promise<Nullable<Inventory>> {
    const r = await this.db.inventory.findFirst({
      where: { roomTypeId, inventoryDate: date },
    });
    return r ? toInventory(r) : null;
  }

  async findByHotelAndDateRange(
    hotelId: string,
    startDate: Date,
    endDate: Date,
    roomTypeId?: string
  ): Promise<Inventory[]> {
    const records = await this.db.inventory.findMany({
      where: {
        hotelId,
        inventoryDate: { gte: startDate, lte: endDate },
        ...(roomTypeId ? { roomTypeId } : {}),
      },
      orderBy: { inventoryDate: "asc" },
    });
    return records.map(toInventory);
  }

  async upsertByRoomTypeAndDate(
    roomTypeId: string,
    hotelId: string,
    orgId: string,
    date: Date,
    totalInventory: number
  ): Promise<Inventory> {
    const r = await this.db.inventory.upsert({
      where: { roomTypeId_inventoryDate: { roomTypeId, inventoryDate: date } },
      create: {
        hotelId,
        organizationId: orgId,
        roomTypeId,
        inventoryDate: date,
        totalInventory,
        reservedInventory: 0,
        blockedInventory: 0,
      },
      update: { totalInventory },
    });
    return toInventory(r);
  }

  async adjustReservedInventory(
    id: string,
    delta: number,
    tx?: PrismaTransactionClient
  ): Promise<Inventory> {
    const client = tx ?? this.db;
    const updated = await client.inventory.update({
      where: { id },
      data: { reservedInventory: { increment: delta } },
    });

    if (updated.reservedInventory < 0) {
      throw new ConflictError(INVENTORY_ERRORS.NEGATIVE_INVENTORY, {
        field: "reservedInventory",
        value: updated.reservedInventory,
      });
    }
    if (updated.reservedInventory + updated.blockedInventory > updated.totalInventory) {
      throw new ConflictError(INVENTORY_ERRORS.EXCEEDS_TOTAL, {
        totalInventory: updated.totalInventory,
        reservedInventory: updated.reservedInventory,
        blockedInventory: updated.blockedInventory,
      });
    }

    return toInventory(updated);
  }

  async adjustBlockedInventory(
    id: string,
    delta: number,
    tx?: PrismaTransactionClient
  ): Promise<Inventory> {
    const client = tx ?? this.db;
    const updated = await client.inventory.update({
      where: { id },
      data: { blockedInventory: { increment: delta } },
    });

    if (updated.blockedInventory < 0) {
      throw new ConflictError(INVENTORY_ERRORS.NEGATIVE_INVENTORY, {
        field: "blockedInventory",
        value: updated.blockedInventory,
      });
    }
    if (updated.reservedInventory + updated.blockedInventory > updated.totalInventory) {
      throw new ConflictError(INVENTORY_ERRORS.EXCEEDS_TOTAL, {
        totalInventory: updated.totalInventory,
        reservedInventory: updated.reservedInventory,
        blockedInventory: updated.blockedInventory,
      });
    }

    return toInventory(updated);
  }

  async lockForUpdate(id: string, tx: PrismaTransactionClient): Promise<Nullable<Inventory>> {
    const r = await tx.inventory.findFirst({ where: { id } });
    return r ? toInventory(r) : null;
  }
}
