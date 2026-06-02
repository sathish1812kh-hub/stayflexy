// FILE: src/modules/inventory/repositories/PrismaInventoryBlockRepository.ts
import { type Prisma, type $Enums } from "@prisma/client";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import { InventoryBlockRepository } from "./index";
import type {
  InventoryBlock,
  InventoryBlockReason,
  CreateInventoryBlockData,
  UpdateInventoryBlockData,
} from "../types";

type PrismaInventoryBlock = Prisma.InventoryBlockGetPayload<Record<string, never>>;

function toBlock(r: PrismaInventoryBlock): InventoryBlock {
  return {
    id: r.id,
    inventoryId: r.inventoryId,
    hotelId: r.hotelId,
    reason: r.reason as InventoryBlockReason,
    blockedById: r.blockedById,
    quantity: r.quantity,
    notes: r.notes,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaInventoryBlockRepository extends InventoryBlockRepository {
  async findById(id: string): Promise<Nullable<InventoryBlock>> {
    const r = await this.db.inventoryBlock.findFirst({ where: { id } });
    return r ? toBlock(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<InventoryBlock>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.inventoryBlock.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.inventoryBlock.count(),
    ]);
    return {
      data: records.map(toBlock),
      meta: this.buildPaginationMeta(total, params),
    };
  }

  async create(data: CreateInventoryBlockData): Promise<InventoryBlock> {
    const r = await this.db.inventoryBlock.create({
      data: {
        inventoryId: data.inventoryId,
        hotelId: data.hotelId,
        reason: data.reason as $Enums.InventoryBlockReason,
        blockedById: data.blockedById,
        quantity: data.quantity,
        notes: data.notes,
        isActive: data.isActive,
      },
    });
    return toBlock(r);
  }

  async update(id: string, data: UpdateInventoryBlockData): Promise<InventoryBlock> {
    const payload: Prisma.InventoryBlockUpdateInput = {};
    if (data.isActive !== undefined) payload.isActive = data.isActive;
    if (data.notes !== undefined) payload.notes = data.notes;
    const r = await this.db.inventoryBlock.update({ where: { id }, data: payload });
    return toBlock(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.inventoryBlock.delete({ where: { id } });
  }

  async findActiveByInventory(inventoryId: string): Promise<InventoryBlock[]> {
    const records = await this.db.inventoryBlock.findMany({
      where: { inventoryId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toBlock);
  }

  async findByHotelAndDateRange(
    hotelId: string,
    startDate: Date,
    endDate: Date
  ): Promise<InventoryBlock[]> {
    const records = await this.db.inventoryBlock.findMany({
      where: {
        hotelId,
        inventory: {
          inventoryDate: { gte: startDate, lte: endDate },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toBlock);
  }

  async deactivate(id: string): Promise<InventoryBlock> {
    const r = await this.db.inventoryBlock.update({
      where: { id },
      data: { isActive: false },
    });
    return toBlock(r);
  }

  async deactivateByInventory(inventoryId: string): Promise<void> {
    await this.db.inventoryBlock.updateMany({
      where: { inventoryId, isActive: true },
      data: { isActive: false },
    });
  }

  async countActiveByInventory(inventoryId: string): Promise<number> {
    return this.db.inventoryBlock.count({
      where: { inventoryId, isActive: true },
    });
  }
}
