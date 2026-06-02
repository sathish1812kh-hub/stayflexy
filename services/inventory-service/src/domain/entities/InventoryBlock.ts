export type BlockReason =
  | 'MAINTENANCE'
  | 'OTA_BLOCK'
  | 'MANUAL_BLOCK'
  | 'HOTEL_USE'
  | 'RENOVATION'
  | 'VIP_HOLD'
  | 'CONTINGENCY'

export interface InventoryBlockProps {
  id: string
  inventoryId: string
  hotelId: string
  organizationId: string
  reason: BlockReason
  blockedById: string
  quantity: number
  notes: string | null
  isActive: boolean
  correlationId: string | null
  createdAt: Date
  updatedAt: Date
}

export class InventoryBlock {
  constructor(private readonly props: InventoryBlockProps) {}

  get id(): string { return this.props.id }
  get inventoryId(): string { return this.props.inventoryId }
  get hotelId(): string { return this.props.hotelId }
  get organizationId(): string { return this.props.organizationId }
  get reason(): BlockReason { return this.props.reason }
  get blockedById(): string { return this.props.blockedById }
  get quantity(): number { return this.props.quantity }
  get notes(): string | null { return this.props.notes }
  get isActive(): boolean { return this.props.isActive }
  get correlationId(): string | null { return this.props.correlationId }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  toJSON(): InventoryBlockProps {
    return { ...this.props }
  }
}
