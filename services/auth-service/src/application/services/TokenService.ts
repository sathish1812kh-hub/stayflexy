import { generateAccessToken, generateRefreshToken, hashToken } from '@stayflexi/shared-auth'
import type { TokenPair } from '@stayflexi/shared-auth'
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository'

export class TokenService {
  constructor(
    private readonly tokenRepo: IRefreshTokenRepository,
    private readonly jwtSecret: string,
    private readonly jwtRefreshSecret: string,
    private readonly accessExpiresIn: string,
    private readonly refreshExpiresInMs: number
  ) {}

  async issueTokenPair(
    userId: string,
    organizationId: string | null,
    primaryRole: string,
    context: { ipAddress?: string; userAgent?: string },
    _correlationId?: string
  ): Promise<TokenPair> {
    // Access token: short-lived JWT
    const accessToken = generateAccessToken(
      { sub: userId, organizationId: organizationId ?? undefined, primaryRole },
      this.jwtSecret,
      this.accessExpiresIn
    )

    // Refresh token: opaque, stored hashed in DB
    // Embed userId as prefix so we can find tokens without full table scan
    const rawRefreshToken = `${userId}:${generateRefreshToken()}`
    const tokenHash = await hashToken(rawRefreshToken, 10)
    const expiresAt = new Date(Date.now() + this.refreshExpiresInMs)

    await this.tokenRepo.create({
      userId,
      tokenHash,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      expiresAt,
    })

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      accessExpiresIn: this.parseExpiresIn(this.accessExpiresIn),
    }
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/)
    if (!match || !match[1] || !match[2]) return 900
    const value = parseInt(match[1], 10)
    const unit = match[2]
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
    return value * (multipliers[unit] ?? 1)
  }
}
