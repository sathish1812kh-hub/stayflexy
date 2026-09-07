export type NightAuditStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

export interface NightAuditProps {
  id: string
  organizationId: string
  hotelId: string
  auditDate: Date
  status: NightAuditStatus
  closedById: string | null
  entries: Record<string, unknown> | null
  totalRevenue: number | null
  totalPayments: number | null
  folioCount: number
  startedAt: Date | null
  completedAt: Date | null
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}

export class NightAudit {
  constructor(private readonly props: NightAuditProps) {}
  get id(): string {
    return this.props.id
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get hotelId(): string {
    return this.props.hotelId
  }
  get auditDate(): Date {
    return this.props.auditDate
  }
  get status(): NightAuditStatus {
    return this.props.status
  }
  get closedById(): string | null {
    return this.props.closedById
  }
  get folioCount(): number {
    return this.props.folioCount
  }
  get createdAt(): Date {
    return this.props.createdAt
  }

  isCompleted(): boolean {
    return this.props.status === 'COMPLETED'
  }
  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }
  toJSON(): NightAuditProps {
    return { ...this.props }
  }
}
