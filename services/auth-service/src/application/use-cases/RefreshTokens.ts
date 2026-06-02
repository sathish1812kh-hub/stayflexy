import { UnauthorizedError } from '@stayflexi/shared-errors'
import { compareToken } from '@stayflexi/shared-auth'
import type { TokenPair } from '@stayflexi/shared-auth'
import type { Logger } from '@stayflexi/shared-logger'
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { RefreshDto } from '../dtos/auth.dto'
import type { TokenService } from '../services/TokenService'

export class RefreshTokens {
  constructor(
    private readonly tokenRepo: IRefreshTokenRepository,
    private readonly userRepo: IUserRepository,
    private readonly tokenService: TokenService,
    private readonly logger: Logger
  ) {}

  async execute(
    dto: RefreshDto,
    ipAddress: string,
    userAgent: string,
    correlationId?: string
  ): Promise<TokenPair> {
    // The token format is: {userId}:{randomPart}
    // Split on first colon to extract userId prefix
    const colonIndex = dto.refreshToken.indexOf(':')
    if (colonIndex === -1) {
      throw new UnauthorizedError('Invalid refresh token', 'INVALID_TOKEN')
    }

    const userId = dto.refreshToken.substring(0, colonIndex)
    if (!userId || userId.length < 1) {
      throw new UnauthorizedError('Invalid refresh token', 'INVALID_TOKEN')
    }

    const tokens = await this.tokenRepo.findActiveTokens(userId, 20)

    let matchedToken = null
    for (const token of tokens) {
      if (!token.isValid) continue
      const matches = await compareToken(dto.refreshToken, token.tokenHash)
      if (matches) {
        matchedToken = token
        break
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedError(
        'Refresh token is invalid, expired, or already used',
        'INVALID_TOKEN'
      )
    }

    // Load user
    const user = await this.userRepo.findById(userId)
    if (!user || !user.canLogin()) {
      throw new UnauthorizedError('Account is not active', 'ACCOUNT_INACTIVE')
    }

    // Revoke old token (rotation)
    await this.tokenRepo.revoke(matchedToken.id)

    // Issue new pair
    const newTokens = await this.tokenService.issueTokenPair(
      user.id,
      user.organizationId,
      user.primaryRole,
      { ipAddress, userAgent },
      correlationId
    )

    this.logger.info({ userId, correlationId }, 'Refresh tokens rotated')
    return newTokens
  }
}
