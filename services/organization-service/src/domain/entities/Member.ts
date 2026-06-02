export interface MemberProps {
  id: string
  organizationId: string
  userId: string
  isOwner: boolean
  joinedAt: Date
  removedAt: Date | null
}

export class Member {
  constructor(private readonly props: MemberProps) {}

  get id(): string { return this.props.id }
  get organizationId(): string { return this.props.organizationId }
  get userId(): string { return this.props.userId }
  get isOwner(): boolean { return this.props.isOwner }
  get joinedAt(): Date { return this.props.joinedAt }
  get removedAt(): Date | null { return this.props.removedAt }
  get isActive(): boolean { return this.props.removedAt === null }

  toJSON(): MemberProps {
    return { ...this.props }
  }
}
