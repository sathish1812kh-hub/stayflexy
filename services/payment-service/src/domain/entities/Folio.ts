export type FolioStatus = 'OPEN' | 'CLOSED' | 'VOID'

export interface FolioProps {
  id: string
  organizationId: string
  hotelId: string
  bookingId: string
  folioNumber: string
  status: FolioStatus
  balance: number
  currency: string
  closedAt: Date | null
  closedById: string | null
  createdAt: Date
  updatedAt: Date
}

export class Folio {
  constructor(private readonly props: FolioProps) {}
  get id(): string {
    return this.props.id
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get hotelId(): string {
    return this.props.hotelId
  }
  get bookingId(): string {
    return this.props.bookingId
  }
  get folioNumber(): string {
    return this.props.folioNumber
  }
  get status(): FolioStatus {
    return this.props.status
  }
  get balance(): number {
    return this.props.balance
  }
  get currency(): string {
    return this.props.currency
  }
  get closedAt(): Date | null {
    return this.props.closedAt
  }
  get createdAt(): Date {
    return this.props.createdAt
  }

  isOpen(): boolean {
    return this.props.status === 'OPEN'
  }
  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }
  toJSON(): FolioProps {
    return { ...this.props }
  }
}

export type FolioEntryType = 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT' | 'REFUND' | 'TAX' | 'FEE'

export interface FolioEntryProps {
  id: string
  folioId: string
  organizationId: string
  hotelId: string
  entryType: FolioEntryType
  description: string
  amount: number
  balanceAfter: number | null
  referenceId: string | null
  referenceType: string | null
  createdById: string | null
  createdAt: Date
}

export class FolioEntry {
  constructor(private readonly props: FolioEntryProps) {}
  get id(): string {
    return this.props.id
  }
  get folioId(): string {
    return this.props.folioId
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get amount(): number {
    return this.props.amount
  }
  get entryType(): FolioEntryType {
    return this.props.entryType
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  toJSON(): FolioEntryProps {
    return { ...this.props }
  }
}
