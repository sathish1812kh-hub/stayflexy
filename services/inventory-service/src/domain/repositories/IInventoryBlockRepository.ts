import type { InventoryBlock } from '../entities/InventoryBlock'
import type { BlockReason } from '../entities/InventoryBlock'

export interface CreateBlockData {
  inventoryId: string
  hotelId: string
  organizationId: string
  reason: BlockReason
  blockedById: string
  quantity: number
  notes?: string
  correlationId?: string
}

export interface IInventoryBlockRepository {
  create(data: CreateBlockData): Promise<InventoryBlock>
  deactivateOldestByInventory(inventoryId: string, quantity: number): Promise<number>
  findActiveByInventory(inventoryId: string): Promise<InventoryBlock[]>
}
