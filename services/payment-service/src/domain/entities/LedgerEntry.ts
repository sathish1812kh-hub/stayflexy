// Immutable financial ledger entry — append-only, never updated or deleted
export type LedgerEntryType = 'DEBIT' | 'CREDIT'
export type LedgerCategory = 'PAYMENT' | 'REFUND' | 'FEE' | 'ADJUSTMENT' | 'TAX'

export interface LedgerEntryProps {
  id: string
  organizationId: string
  hotelId: string
  referenceId: string       // paymentId or refundId
  referenceType: string     // 'Payment' | 'Refund'
  entryType: LedgerEntryType
  category: LedgerCategory
  amount: number
  currency: string
  description: string
  balanceAfter: number      // Running balance (for audit trails)
  correlationId?: string
  createdAt: Date
}

export class LedgerEntry {
  constructor(private readonly props: LedgerEntryProps) {}

  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get referenceId() { return this.props.referenceId }
  get referenceType() { return this.props.referenceType }
  get entryType() { return this.props.entryType }
  get category() { return this.props.category }
  get amount() { return this.props.amount }
  get currency() { return this.props.currency }
  get description() { return this.props.description }
  get balanceAfter() { return this.props.balanceAfter }
  get createdAt() { return this.props.createdAt }

  toJSON(): LedgerEntryProps { return { ...this.props } }
}
