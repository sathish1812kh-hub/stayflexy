import type { RefreshToken } from '../entities/RefreshToken'

export interface CreateRefreshTokenData {
  userId: string
  tokenHash: string
  ipAddress?: string | null
  userAgent?: string | null
  expiresAt: Date
}

export interface IRefreshTokenRepository {
  findActiveByUserId(userId: string): Promise<RefreshToken[]>
  create(data: CreateRefreshTokenData): Promise<RefreshToken>
  revoke(id: string): Promise<void>
  revokeAllByUserId(userId: string): Promise<number>
  findActiveTokens(userId: string, limit: number): Promise<RefreshToken[]>
}
