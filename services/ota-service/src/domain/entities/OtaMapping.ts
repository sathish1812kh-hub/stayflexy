export interface OtaMappingProps {
  id: string
  organizationId: string
  hotelId: string
  roomTypeId: string | null
  providerId: string
  externalHotelId: string
  externalRoomTypeId: string | null
  syncStatus: string
  isActive: boolean
  lastSyncedAt: Date | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}

export class OtaMapping {
  constructor(private readonly props: OtaMappingProps) {}

  get id(): string { return this.props.id }
  get organizationId(): string { return this.props.organizationId }
  get hotelId(): string { return this.props.hotelId }
  get roomTypeId(): string | null { return this.props.roomTypeId }
  get providerId(): string { return this.props.providerId }
  get externalHotelId(): string { return this.props.externalHotelId }
  get externalRoomTypeId(): string | null { return this.props.externalRoomTypeId }
  get syncStatus(): string { return this.props.syncStatus }
  get isActive(): boolean { return this.props.isActive }
  get lastSyncedAt(): Date | null { return this.props.lastSyncedAt }
  get metadata(): unknown { return this.props.metadata }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): OtaMappingProps {
    return { ...this.props }
  }
}
