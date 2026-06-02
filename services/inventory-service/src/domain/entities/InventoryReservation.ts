export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED'

export interface InventoryReservationProps {
  id: string
  inventoryId: string
  hotelId: string
  organizationId: string
  roomTypeId: string
  bookingRef: string
  quantity: number
  status: ReservationStatus
  correlationId: string | null
  createdAt: Date
  updatedAt: Date
  releasedAt: Date | null
}

export class InventoryReservation {
  constructor(private readonly props: InventoryReservationProps) {}

  get id(): string { return this.props.id }
  get inventoryId(): string { return this.props.inventoryId }
  get hotelId(): string { return this.props.hotelId }
  get organizationId(): string { return this.props.organizationId }
  get roomTypeId(): string { return this.props.roomTypeId }
  get bookingRef(): string { return this.props.bookingRef }
  get quantity(): number { return this.props.quantity }
  get status(): ReservationStatus { return this.props.status }
  get correlationId(): string | null { return this.props.correlationId }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get releasedAt(): Date | null { return this.props.releasedAt }

  get isActive(): boolean { return this.props.status === 'ACTIVE' }

  toJSON(): InventoryReservationProps {
    return { ...this.props }
  }
}
