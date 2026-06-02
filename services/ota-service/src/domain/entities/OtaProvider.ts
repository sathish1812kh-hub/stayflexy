export interface OtaProviderProps {
  id: string
  providerCode: string
  providerName: string
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
  description: string | null
  webhookUrl: string | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}

export class OtaProvider {
  constructor(private readonly props: OtaProviderProps) {}

  get id(): string { return this.props.id }
  get providerCode(): string { return this.props.providerCode }
  get providerName(): string { return this.props.providerName }
  get status(): 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' { return this.props.status }
  get description(): string | null { return this.props.description }
  get webhookUrl(): string | null { return this.props.webhookUrl }
  get metadata(): unknown { return this.props.metadata }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  isActive(): boolean {
    return this.props.status === 'ACTIVE'
  }

  toJSON(): OtaProviderProps {
    return { ...this.props }
  }
}
