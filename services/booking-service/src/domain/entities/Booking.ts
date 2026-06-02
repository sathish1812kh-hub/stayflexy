export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW'
export type BookingSource = 'DIRECT' | 'OTA' | 'WALK_IN' | 'PHONE' | 'EMAIL' | 'AGENT' | 'ONLINE'
export type CancellationReason = 'GUEST_REQUEST' | 'NO_SHOW' | 'HOTEL_REQUEST' | 'FORCE_MAJEURE' | 'DUPLICATE_BOOKING' | 'OTHER'

export interface BookingAmounts {
  totalAmount: number
  taxAmount: number
  discountAmount: number
  finalAmount: number
  currency: string
}

export interface BookingProps {
  id: string
  organizationId: string
  hotelId: string
  bookingNumber: string
  status: BookingStatus
  source: BookingSource
  primaryGuestId: string | null
  amounts: BookingAmounts
  specialRequests: string | null
  internalNotes: string | null
  bookedById: string
  checkedInAt: Date | null
  checkedInById: string | null
  checkedOutAt: Date | null
  checkedOutById: string | null
  cancelledAt: Date | null
  cancelledById: string | null
  cancellationReason: CancellationReason | null
  cancellationNote: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class Booking {
  constructor(private readonly props: BookingProps) {}

  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get bookingNumber() { return this.props.bookingNumber }
  get status() { return this.props.status }
  get source() { return this.props.source }
  get primaryGuestId() { return this.props.primaryGuestId }
  get amounts() { return this.props.amounts }
  get specialRequests() { return this.props.specialRequests }
  get internalNotes() { return this.props.internalNotes }
  get bookedById() { return this.props.bookedById }
  get checkedInAt() { return this.props.checkedInAt }
  get checkedInById() { return this.props.checkedInById }
  get checkedOutAt() { return this.props.checkedOutAt }
  get checkedOutById() { return this.props.checkedOutById }
  get cancelledAt() { return this.props.cancelledAt }
  get cancelledById() { return this.props.cancelledById }
  get cancellationReason() { return this.props.cancellationReason }
  get cancellationNote() { return this.props.cancellationNote }
  get createdAt() { return this.props.createdAt }
  get updatedAt() { return this.props.updatedAt }
  get isDeleted() { return this.props.deletedAt !== null }
  get isPending() { return this.props.status === 'PENDING' }
  get isConfirmed() { return this.props.status === 'CONFIRMED' }
  get isCheckedIn() { return this.props.status === 'CHECKED_IN' }
  get isCheckedOut() { return this.props.status === 'CHECKED_OUT' }
  get isCancelled() { return this.props.status === 'CANCELLED' }
  get isActive() { return !this.isCancelled && !this.isCheckedOut && !this.isDeleted }

  canBeCancelled(): boolean {
    return this.props.status === 'PENDING' || this.props.status === 'CONFIRMED' || this.props.status === 'NO_SHOW'
  }

  canCheckIn(): boolean {
    return this.props.status === 'CONFIRMED' || this.props.status === 'PENDING'
  }

  canCheckOut(): boolean {
    return this.props.status === 'CHECKED_IN'
  }

  canBeModified(): boolean {
    return this.props.status === 'PENDING' || this.props.status === 'CONFIRMED'
  }

  belongsToOrganization(organizationId: string): boolean {
    return this.props.organizationId === organizationId
  }

  toJSON(): BookingProps { return { ...this.props } }
}
