export interface SyncJobProps {
  id: string
  organizationId: string
  hotelId: string
  providerId: string
  syncType: string
  syncStatus: string
  idempotencyKey: string
  startedAt: Date | null
  completedAt: Date | null
  retryCount: number
  maxRetries: number
  errorMessage: string | null
  payload: unknown
  createdById: string | null
  createdAt: Date
  updatedAt: Date
}

export class SyncJob {
  constructor(private readonly props: SyncJobProps) {}

  get id(): string { return this.props.id }
  get organizationId(): string { return this.props.organizationId }
  get hotelId(): string { return this.props.hotelId }
  get providerId(): string { return this.props.providerId }
  get syncType(): string { return this.props.syncType }
  get syncStatus(): string { return this.props.syncStatus }
  get idempotencyKey(): string { return this.props.idempotencyKey }
  get startedAt(): Date | null { return this.props.startedAt }
  get completedAt(): Date | null { return this.props.completedAt }
  get retryCount(): number { return this.props.retryCount }
  get maxRetries(): number { return this.props.maxRetries }
  get errorMessage(): string | null { return this.props.errorMessage }
  get payload(): unknown { return this.props.payload }
  get createdById(): string | null { return this.props.createdById }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  canRetry(): boolean {
    return this.props.retryCount < this.props.maxRetries
  }

  isPending(): boolean {
    return this.props.syncStatus === 'PENDING'
  }

  isRunning(): boolean {
    return this.props.syncStatus === 'RUNNING'
  }

  isCompleted(): boolean {
    return this.props.syncStatus === 'SUCCESS' || this.props.syncStatus === 'FAILED'
  }

  toJSON(): SyncJobProps {
    return { ...this.props }
  }
}
