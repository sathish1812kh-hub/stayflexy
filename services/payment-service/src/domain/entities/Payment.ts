export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED'

export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'UPI' | 'WALLET' | 'OTA_COLLECT' | 'OTHER'

export interface PaymentProps {
  id: string
  organizationId: string
  hotelId: string
  bookingId: string
  paymentReference: string
  paymentMethod: PaymentMethod
  paymentProvider: string | null
  transactionId: string | null
  paymentStatus: PaymentStatus
  amount: number
  currency: string
  paidAt: Date | null
  refundedAt: Date | null
  failureReason: string | null
  metadata: Record<string, unknown> | null
  processedById: string
  createdAt: Date
  updatedAt: Date
}

export class Payment {
  constructor(private readonly props: PaymentProps) {}

  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get bookingId() { return this.props.bookingId }
  get paymentReference() { return this.props.paymentReference }
  get paymentMethod() { return this.props.paymentMethod }
  get paymentProvider() { return this.props.paymentProvider }
  get transactionId() { return this.props.transactionId }
  get paymentStatus() { return this.props.paymentStatus }
  get amount() { return this.props.amount }
  get currency() { return this.props.currency }
  get paidAt() { return this.props.paidAt }
  get refundedAt() { return this.props.refundedAt }
  get failureReason() { return this.props.failureReason }
  get metadata() { return this.props.metadata }
  get processedById() { return this.props.processedById }
  get createdAt() { return this.props.createdAt }
  get updatedAt() { return this.props.updatedAt }

  get isSuccessful() { return this.props.paymentStatus === 'SUCCESS' }

  /** PENDING, PROCESSING, and AUTHORIZED are all considered "in-flight" / pending */
  get isPending() {
    return (
      this.props.paymentStatus === 'PENDING' ||
      this.props.paymentStatus === 'PROCESSING' ||
      this.props.paymentStatus === 'AUTHORIZED'
    )
  }

  get isFailed() { return this.props.paymentStatus === 'FAILED' }
  get isFullyRefunded() { return this.props.paymentStatus === 'REFUNDED' }
  get isPartiallyRefunded() { return this.props.paymentStatus === 'PARTIALLY_REFUNDED' }
  get isCancelled() { return this.props.paymentStatus === 'CANCELLED' }

  /** SUCCESS or PARTIALLY_REFUNDED or CAPTURED payments can be refunded */
  get canBeRefunded() {
    return (
      this.props.paymentStatus === 'SUCCESS' ||
      this.props.paymentStatus === 'PARTIALLY_REFUNDED' ||
      this.props.paymentStatus === 'CAPTURED'
    )
  }

  /** Only PENDING or AUTHORIZED payments can be cancelled */
  get canBeCancelled() {
    return (
      this.props.paymentStatus === 'PENDING' ||
      this.props.paymentStatus === 'AUTHORIZED'
    )
  }

  belongsToOrganization(orgId: string): boolean { return this.props.organizationId === orgId }
  toJSON(): PaymentProps { return { ...this.props } }
}
