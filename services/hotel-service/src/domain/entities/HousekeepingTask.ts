export type HousekeepingTaskType =
  | 'STANDARD_CLEANING'
  | 'DEEP_CLEANING'
  | 'TURNDOWN'
  | 'INSPECTION'
  | 'LINEN_CHANGE'
  | 'BATHROOM_CLEANING'
  | 'CHECKOUT_CLEANING'
export type HousekeepingPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type HousekeepingTaskStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'VERIFIED'

export interface HousekeepingTaskProps {
  id: string
  organizationId: string
  hotelId: string
  roomId: string
  assignedTo: string | null
  taskType: HousekeepingTaskType
  priority: HousekeepingPriority
  taskStatus: HousekeepingTaskStatus
  scheduledAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  notes: string | null
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export class HousekeepingTask {
  constructor(private readonly props: HousekeepingTaskProps) {}

  get id(): string {
    return this.props.id
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get hotelId(): string {
    return this.props.hotelId
  }
  get roomId(): string {
    return this.props.roomId
  }
  get assignedTo(): string | null {
    return this.props.assignedTo
  }
  get taskType(): HousekeepingTaskType {
    return this.props.taskType
  }
  get priority(): HousekeepingPriority {
    return this.props.priority
  }
  get taskStatus(): HousekeepingTaskStatus {
    return this.props.taskStatus
  }
  get scheduledAt(): Date | null {
    return this.props.scheduledAt
  }
  get startedAt(): Date | null {
    return this.props.startedAt
  }
  get completedAt(): Date | null {
    return this.props.completedAt
  }
  get notes(): string | null {
    return this.props.notes
  }
  get createdById(): string {
    return this.props.createdById
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  canTransitionTo(next: HousekeepingTaskStatus): boolean {
    const order: Record<HousekeepingTaskStatus, number> = {
      PENDING: 0,
      ASSIGNED: 1,
      IN_PROGRESS: 2,
      COMPLETED: 3,
      VERIFIED: 4,
    }
    return order[next] > order[this.props.taskStatus]
  }

  belongsToOrganization(orgId: string): boolean {
    return this.props.organizationId === orgId
  }

  toJSON(): HousekeepingTaskProps {
    return { ...this.props }
  }
}
