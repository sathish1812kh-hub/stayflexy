export interface NotificationProps {
  id: string
  organizationId: string
  hotelId: string | null
  notificationType: string
  recipient: string
  subject: string | null
  message: string
  deliveryStatus: string
  retryCount: number
  maxRetries: number
  scheduledAt: Date | null
  deliveredAt: Date | null
  failedReason: string | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}

export class Notification {
  constructor(private readonly props: NotificationProps) {}

  get id(): string { return this.props.id }
  get organizationId(): string { return this.props.organizationId }
  get hotelId(): string | null { return this.props.hotelId }
  get notificationType(): string { return this.props.notificationType }
  get recipient(): string { return this.props.recipient }
  get subject(): string | null { return this.props.subject }
  get message(): string { return this.props.message }
  get deliveryStatus(): string { return this.props.deliveryStatus }
  get retryCount(): number { return this.props.retryCount }
  get maxRetries(): number { return this.props.maxRetries }
  get scheduledAt(): Date | null { return this.props.scheduledAt }
  get deliveredAt(): Date | null { return this.props.deliveredAt }
  get failedReason(): string | null { return this.props.failedReason }
  get metadata(): unknown { return this.props.metadata }
  get createdAt(): Date { return this.props.createdAt }

  canRetry(): boolean {
    return this.props.retryCount < this.props.maxRetries && this.props.deliveryStatus === 'FAILED'
  }

  isPending(): boolean {
    return this.props.deliveryStatus === 'PENDING'
  }

  isDelivered(): boolean {
    return this.props.deliveryStatus === 'DELIVERED' || this.props.deliveryStatus === 'SENT'
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): NotificationProps {
    return { ...this.props }
  }
}
