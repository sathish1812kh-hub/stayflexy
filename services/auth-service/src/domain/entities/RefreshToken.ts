export interface RefreshTokenProps {
  id: string
  userId: string
  tokenHash: string
  ipAddress: string | null
  userAgent: string | null
  expiresAt: Date
  revokedAt: Date | null
  createdAt: Date
}

export class RefreshToken {
  constructor(private readonly props: RefreshTokenProps) {}

  get id(): string { return this.props.id }
  get userId(): string { return this.props.userId }
  get tokenHash(): string { return this.props.tokenHash }
  get ipAddress(): string | null { return this.props.ipAddress }
  get userAgent(): string | null { return this.props.userAgent }
  get expiresAt(): Date { return this.props.expiresAt }
  get isRevoked(): boolean { return this.props.revokedAt !== null }
  get isExpired(): boolean { return this.props.expiresAt < new Date() }
  get isValid(): boolean { return !this.isRevoked && !this.isExpired }
}
