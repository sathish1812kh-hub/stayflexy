export interface NotificationPreferenceProps {
  id: string
  organizationId: string
  userId: string
  channel: string
  isEnabled: boolean
  preferences: unknown
  createdAt: Date
  updatedAt: Date
}

export class NotificationPreference {
  constructor(private readonly props: NotificationPreferenceProps) {}

  get id(): string {
    return this.props.id
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get userId(): string {
    return this.props.userId
  }
  get channel(): string {
    return this.props.channel
  }
  get isEnabled(): boolean {
    return this.props.isEnabled
  }
  get preferences(): unknown {
    return this.props.preferences
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): NotificationPreferenceProps {
    return { ...this.props }
  }
}
