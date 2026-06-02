import { fromPrismaError } from '@stayflexi/shared-errors'
import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import type { PrismaClient } from '@prisma/client'
import { RefreshToken } from '../../domain/entities/RefreshToken'
import type { IRefreshTokenRepository, CreateRefreshTokenData } from '../../domain/repositories/IRefreshTokenRepository'

// Use Prisma's generated validator to get the correct field types
const refreshTokenSelect = Prisma.validator<Prisma.RefreshTokenDefaultArgs>()({})
type RawRefreshToken = Prisma.RefreshTokenGetPayload<typeof refreshTokenSelect>

function mapToRefreshToken(raw: RawRefreshToken): RefreshToken {
  return new RefreshToken({
    id: raw.id,
    userId: raw.userId,
    tokenHash: raw.tokenHash,
    ipAddress: raw.ipAddress,
    userAgent: raw.userAgent,
    expiresAt: raw.expiresAt,
    revokedAt: raw.revokedAt,
    createdAt: raw.createdAt,
  })
}

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    const records = await this.db.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    return records.map(mapToRefreshToken)
  }

  async findActiveTokens(userId: string, limit: number): Promise<RefreshToken[]> {
    const records = await this.db.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return records.map(mapToRefreshToken)
  }

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    try {
      const raw = await this.db.refreshToken.create({
        data: {
          userId: data.userId,
          tokenHash: data.tokenHash,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
          expiresAt: data.expiresAt,
        },
      })
      return mapToRefreshToken(raw)
    } catch (err) {
      const appErr = fromPrismaError(err)
      if (appErr) throw appErr
      throw err
    }
  }

  async revoke(id: string): Promise<void> {
    await this.db.refreshToken
      .update({ where: { id }, data: { revokedAt: new Date() } })
      .catch(() => undefined)
  }

  async revokeAllByUserId(userId: string): Promise<number> {
    const result = await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return result.count
  }
}
