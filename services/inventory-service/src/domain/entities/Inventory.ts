export interface InventoryProps {
  id: string
  hotelId: string
  organizationId: string
  roomTypeId: string
  inventoryDate: Date
  totalRooms: number
  reservedCount: number
  blockedCount: number
  createdAt: Date
  updatedAt: Date
}

export class Inventory {
  constructor(private readonly props: InventoryProps) {}

  get id(): string { return this.props.id }
  get hotelId(): string { return this.props.hotelId }
  get organizationId(): string { return this.props.organizationId }
  get roomTypeId(): string { return this.props.roomTypeId }
  get inventoryDate(): Date { return this.props.inventoryDate }
  get totalRooms(): number { return this.props.totalRooms }
  get reservedCount(): number { return this.props.reservedCount }
  get blockedCount(): number { return this.props.blockedCount }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  get availableCount(): number {
    return Math.max(0, this.props.totalRooms - this.props.reservedCount - this.props.blockedCount)
  }

  canReserve(quantity: number): boolean {
    return this.availableCount >= quantity
  }

  canBlock(quantity: number): boolean {
    return this.availableCount >= quantity
  }

  belongsTo(organizationId: string): boolean {
    return this.props.organizationId === organizationId
  }

  toJSON(): InventoryProps & { availableCount: number } {
    return {
      ...this.props,
      inventoryDate: this.props.inventoryDate,
      availableCount: this.availableCount,
    }
  }
}
