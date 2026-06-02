// UserStatus and UserRole mirror the Prisma schema enums exactly.
// Domain layer: no Prisma imports — pure TypeScript.

export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION'

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'HOTEL_MANAGER'
  | 'FRONT_DESK'
  | 'HOUSEKEEPING'
  | 'ACCOUNTANT'

export interface UserProps {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone: string | null
  primaryRole: UserRole
  status: UserStatus
  organizationId: string | null
  lastLoginAt: Date | null
  emailVerifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class User {
  constructor(private readonly props: UserProps) {}

  get id(): string { return this.props.id }
  get email(): string { return this.props.email }
  get passwordHash(): string { return this.props.passwordHash }
  get firstName(): string { return this.props.firstName }
  get lastName(): string { return this.props.lastName }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}` }
  get phone(): string | null { return this.props.phone }
  get primaryRole(): UserRole { return this.props.primaryRole }
  get status(): UserStatus { return this.props.status }
  get organizationId(): string | null { return this.props.organizationId }
  get lastLoginAt(): Date | null { return this.props.lastLoginAt }
  get emailVerifiedAt(): Date | null { return this.props.emailVerifiedAt }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }
  get isDeleted(): boolean { return this.props.deletedAt !== null }
  get isActive(): boolean { return this.props.status === 'ACTIVE' }
  get isPendingVerification(): boolean { return this.props.status === 'PENDING_VERIFICATION' }
  get isSuspended(): boolean { return this.props.status === 'SUSPENDED' }

  /**
   * Business rule: a user can log in if they are not soft-deleted and not suspended.
   * INACTIVE accounts are allowed to log in (e.g. trial expired — still readable).
   */
  canLogin(): boolean {
    return !this.isDeleted && this.props.status !== 'SUSPENDED'
  }

  toPublicProfile(): Omit<UserProps, 'passwordHash' | 'deletedAt'> {
    const { passwordHash: _pw, deletedAt: _dt, ...rest } = this.props
    return rest
  }
}
