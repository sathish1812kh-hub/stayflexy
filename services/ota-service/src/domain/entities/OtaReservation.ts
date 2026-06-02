export interface OtaReservationProps {
  id: string
  organizationId: string
  hotelId: string
  providerId: string
  externalReservationId: string
  bookingId: string | null
  syncStatus: 'PENDING' | 'IMPORTED' | 'FAILED' | 'DUPLICATE' | 'REJECTED'
  rawPayload: unknown
  importedAt: Date | null
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}

export class OtaReservation {
  constructor(private readonly props: OtaReservationProps) {}

  get id(): string { return this.props.id }
  get organizationId(): string { return this.props.organizationId }
  get hotelId(): string { return this.props.hotelId }
  get providerId(): string { return this.props.providerId }
  get externalReservationId(): string { return this.props.externalReservationId }
  get bookingId(): string | null { return this.props.bookingId }
  get syncStatus(): 'PENDING' | 'IMPORTED' | 'FAILED' | 'DUPLICATE' | 'REJECTED' { return this.props.syncStatus }
  get rawPayload(): unknown { return this.props.rawPayload }
  get importedAt(): Date | null { return this.props.importedAt }
  get errorMessage(): string | null { return this.props.errorMessage }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  isPending(): boolean {
    return this.props.syncStatus === 'PENDING'
  }

  isImported(): boolean {
    return this.props.syncStatus === 'IMPORTED'
  }

  isDuplicate(): boolean {
    return this.props.syncStatus === 'DUPLICATE'
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): OtaReservationProps {
    return { ...this.props }
  }
}
