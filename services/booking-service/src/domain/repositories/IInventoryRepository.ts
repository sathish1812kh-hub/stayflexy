export interface InventoryAvailability {
  roomTypeId: string
  inventoryDate: Date
  totalInventory: number
  reservedInventory: number
  blockedInventory: number
  availableInventory: number
}

export interface IInventoryRepository {
  checkAvailability(roomTypeId: string, checkInDate: Date, checkOutDate: Date, unitsNeeded?: number): Promise<boolean>
  getAvailabilityForRange(roomTypeId: string, checkInDate: Date, checkOutDate: Date): Promise<InventoryAvailability[]>
  reserveInventory(roomTypeId: string, organizationId: string, hotelId: string, checkInDate: Date, checkOutDate: Date): Promise<void>
  releaseInventory(roomTypeId: string, checkInDate: Date, checkOutDate: Date): Promise<void>
}
