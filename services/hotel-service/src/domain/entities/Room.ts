export type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'OUT_OF_ORDER'
  | 'HOUSEKEEPING'
  | 'MAINTENANCE'
  | 'BLOCKED'

export interface RoomProps {
  id: string
  hotelId: string
  organizationId: string
  roomTypeId: string
  roomNumber: string
  floor: number | null
  status: RoomStatus
  isActive: boolean
  notes: string | null
  wing: string | null
  zone: string | null
  wifiSSID: string | null
  wifiPassword: string | null
  arrivalNotes: string | null
  lockVendor: string | null
  lockDeviceId: string | null
  lockSecret: string | null
  connectingRoomId: string | null
  parentRoomId: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

const VALID_TRANSITIONS: Readonly<Record<RoomStatus, readonly RoomStatus[]>> = {
  AVAILABLE: ['OCCUPIED', 'HOUSEKEEPING', 'MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED'],
  OCCUPIED: ['AVAILABLE', 'HOUSEKEEPING', 'MAINTENANCE', 'OUT_OF_ORDER'],
  HOUSEKEEPING: ['AVAILABLE', 'OUT_OF_ORDER'],
  MAINTENANCE: ['AVAILABLE', 'OUT_OF_ORDER'],
  OUT_OF_ORDER: ['AVAILABLE', 'MAINTENANCE'],
  BLOCKED: ['AVAILABLE'],
}

export class Room {
  constructor(private readonly props: RoomProps) {}

  get id(): string { return this.props.id }
  get hotelId(): string { return this.props.hotelId }
  get organizationId(): string { return this.props.organizationId }
  get roomTypeId(): string { return this.props.roomTypeId }
  get roomNumber(): string { return this.props.roomNumber }
  get floor(): number | null { return this.props.floor }
  get status(): RoomStatus { return this.props.status }
  get isActive(): boolean { return this.props.isActive }
  get notes(): string | null { return this.props.notes }
  get wing(): string | null { return this.props.wing }
  get zone(): string | null { return this.props.zone }
  get wifiSSID(): string | null { return this.props.wifiSSID }
  get wifiPassword(): string | null { return this.props.wifiPassword }
  get arrivalNotes(): string | null { return this.props.arrivalNotes }
  get lockVendor(): string | null { return this.props.lockVendor }
  get lockDeviceId(): string | null { return this.props.lockDeviceId }
  get lockSecret(): string | null { return this.props.lockSecret }
  get connectingRoomId(): string | null { return this.props.connectingRoomId }
  get parentRoomId(): string | null { return this.props.parentRoomId }
  get metadata(): Record<string, unknown> | null { return this.props.metadata }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  canTransitionTo(newStatus: RoomStatus): boolean {
    const allowed = VALID_TRANSITIONS[this.props.status]
    return allowed.includes(newStatus)
  }

  belongsTo(organizationId: string): boolean {
    return this.props.organizationId === organizationId
  }

  toJSON(): RoomProps {
    return { ...this.props }
  }
}
