export type RefundStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'

export interface RefundProps {
  id: string
  paymentId: string
  refundReference: string
  refundAmount: number
  refundReason: string
  refundStatus: RefundStatus
  processedById: string
  processedAt: Date | null
  failureReason: string | null
  createdAt: Date
  updatedAt: Date
}

export class Refund {
  constructor(private readonly props: RefundProps) {}

  get id() { return this.props.id }
  get paymentId() { return this.props.paymentId }
  get refundReference() { return this.props.refundReference }
  get refundAmount() { return this.props.refundAmount }
  get refundReason() { return this.props.refundReason }
  get refundStatus() { return this.props.refundStatus }
  get processedById() { return this.props.processedById }
  get processedAt() { return this.props.processedAt }
  get failureReason() { return this.props.failureReason }
  get createdAt() { return this.props.createdAt }

  get isSuccessful() { return this.props.refundStatus === 'SUCCESS' }
  get isPending() { return this.props.refundStatus === 'PENDING' || this.props.refundStatus === 'PROCESSING' }

  toJSON(): RefundProps { return { ...this.props } }
}
