import { compareToken } from '@stayflexi/shared-auth'
import type { Logger } from '@stayflexi/shared-logger'
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository'
import type { LogoutDto } from '../dtos/auth.dto'
import type { SessionCache } from '../services/SessionCache'

export class LogoutUser {
  constructor(
    private readonly tokenRepo: IRefreshTokenRepository,
    private readonly sessionCache: SessionCache,
    private readonly logger: Logger
  ) {}

  async execute(dto: LogoutDto, userId: string, correlationId?: string): Promise<void> {
    // Find all active refresh tokens for this user
    const tokens = await this.tokenRepo.findActiveTokens(userId, 20)

    // Find matching token by bcrypt comparison
    let matchedTokenId: string | null = null
    for (const token of tokens) {
      const matches = await compareToken(dto.refreshToken, token.tokenHash)
      if (matches) {
        matchedTokenId = token.id
        break
      }
    }

    // Revoke if found (silent if not found — token may already be expired)
    if (matchedTokenId) {
      await this.tokenRepo.revoke(matchedTokenId)
    }

    // Invalidate session cache
    await this.sessionCache.deleteSession(userId)

    this.logger.info({ userId, correlationId }, 'User logged out')
  }
}
