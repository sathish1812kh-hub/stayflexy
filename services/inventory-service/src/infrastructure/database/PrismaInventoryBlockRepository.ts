import type { PrismaClient, Prisma } from '@prisma/client'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { InventoryBlock } from '../../domain/entities/InventoryBlock'
import type { BlockReason } from '../../domain/entities/InventoryBlock'
import type {
  IInventoryBlockRepository,
  CreateBlockData,
} from '../../domain/repositories/IInventoryBlockRepository'

type PrismaBlock = Prisma.InventoryBlockGetPayload<Record<string, never>>

function mapToBlock(raw: PrismaBlock): InventoryBlock {
  return new InventoryBlock({
    id: raw.id,
    inventoryId: raw.inventoryId,
    hotelId: raw.hotelId,
    organizationId: raw.organizationId,
    reason: raw.reason as BlockReason,
    blockedById: raw.blockedById,
    quantity: raw.quantity,
    notes: raw.notes,
    isActive: raw.isActive,
    correlationId: raw.correlationId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  })
}

export class PrismaInventoryBlockRepository implements IInventoryBlockRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: CreateBlockData): Promise<InventoryBlock> {
    try {
      const raw = await this.db.inventoryBlock.create({
        data: {
          inventoryId: data.inventoryId,
          hotelId: data.hotelId,
          organizationId: data.organizationId,
          reason: data.reason,
          blockedById: data.blockedById,
          quantity: data.quantity,
          notes: data.notes ?? null,
          isActive: true,
          correlationId: data.correlationId ?? null,
        },
      })
      return mapToBlock(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async deactivateOldestByInventory(inventoryId: string, quantity: number): Promise<number> {
    try {
      // Find active block records oldest-first, deactivate up to `quantity` of them
      const active = await this.db.inventoryBlock.findMany({
        where: { inventoryId, isActive: true },
        orderBy: { createdAt: 'asc' },
        take: quantity,
        select: { id: true },
      })

      if (active.length === 0) return 0

      const ids = active.map((b) => b.id)
      await this.db.inventoryBlock.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false },
      })

      return ids.length
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findActiveByInventory(inventoryId: string): Promise<InventoryBlock[]> {
    try {
      const records = await this.db.inventoryBlock.findMany({
        where: { inventoryId, isActive: true },
        orderBy: { createdAt: 'desc' },
      })
      return records.map(mapToBlock)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }
}
