export type InvoiceStatus = 'DRAFT' | 'FINALIZED' | 'PAID' | 'VOID'
export type InvoiceItemType = 'ROOM_CHARGE' | 'TAX' | 'DISCOUNT' | 'SERVICE_CHARGE' | 'FOOD_BEVERAGE' | 'LAUNDRY' | 'TRANSPORT' | 'OTHER'

export interface InvoiceItemProps {
  id: string
  invoiceId: string
  itemType: InvoiceItemType
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  taxRate: number
}

export interface InvoiceProps {
  id: string
  organizationId: string
  hotelId: string
  bookingId: string
  invoiceNumber: string
  invoiceStatus: InvoiceStatus
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  currency: string
  issuedAt: Date | null
  dueDate: Date | null
  notes: string | null
  createdById: string
  createdAt: Date
  updatedAt: Date
  items?: InvoiceItemProps[]
}

export class Invoice {
  constructor(private readonly props: InvoiceProps) {}

  get id() { return this.props.id }
  get organizationId() { return this.props.organizationId }
  get hotelId() { return this.props.hotelId }
  get bookingId() { return this.props.bookingId }
  get invoiceNumber() { return this.props.invoiceNumber }
  get invoiceStatus() { return this.props.invoiceStatus }
  get subtotal() { return this.props.subtotal }
  get taxAmount() { return this.props.taxAmount }
  get discountAmount() { return this.props.discountAmount }
  get totalAmount() { return this.props.totalAmount }
  get currency() { return this.props.currency }
  get issuedAt() { return this.props.issuedAt }
  get dueDate() { return this.props.dueDate }
  get notes() { return this.props.notes }
  get createdAt() { return this.props.createdAt }
  get items() { return this.props.items ?? [] }

  get isDraft() { return this.props.invoiceStatus === 'DRAFT' }
  get isFinalized() { return this.props.invoiceStatus === 'FINALIZED' }
  get isPaid() { return this.props.invoiceStatus === 'PAID' }
  get isVoid() { return this.props.invoiceStatus === 'VOID' }
  get canBeFinalized() { return this.props.invoiceStatus === 'DRAFT' }
  get canBeVoided() { return this.props.invoiceStatus === 'FINALIZED' }

  belongsToOrganization(orgId: string): boolean { return this.props.organizationId === orgId }
  toJSON(): InvoiceProps { return { ...this.props } }
}
