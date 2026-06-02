import { type Prisma } from "@prisma/client";
import { RefreshTokenRepository, type CreateRefreshTokenInput } from "./index";
import type { RefreshToken } from "../types";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";

type PrismaRefreshToken = Prisma.RefreshTokenGetPayload<Record<string, never>>;

function toRefreshToken(r: PrismaRefreshToken): RefreshToken {
  return {
    id: r.id,
    userId: r.userId,
    tokenHash: r.tokenHash,
    expiresAt: r.expiresAt,
    revokedAt: r.revokedAt,
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    createdAt: r.createdAt,
    // RefreshToken is append-only; no updatedAt in DB — align with TimestampFields
    updatedAt: r.createdAt,
  };
}

export class PrismaRefreshTokenRepository extends RefreshTokenRepository {
  async findById(id: string): Promise<Nullable<RefreshToken>> {
    const r = await this.db.refreshToken.findUnique({ where: { id } });
    return r ? toRefreshToken(r) : null;
  }

  async findByTokenHash(hash: string): Promise<Nullable<RefreshToken>> {
    const r = await this.db.refreshToken.findUnique({ where: { tokenHash: hash } });
    return r ? toRefreshToken(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<RefreshToken>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.refreshToken.findMany({ skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.refreshToken.count(),
    ]);
    return { data: records.map(toRefreshToken), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateRefreshTokenInput): Promise<RefreshToken> {
    const r = await this.db.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
    return toRefreshToken(r);
  }

  async update(id: string, data: { revokedAt: Date }): Promise<RefreshToken> {
    const r = await this.db.refreshToken.update({
      where: { id },
      data: { revokedAt: data.revokedAt },
    });
    return toRefreshToken(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.refreshToken.delete({ where: { id } });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  // Detects reuse of already-revoked token (token family attack)
  async isRevoked(tokenHash: string): Promise<boolean> {
    const token = await this.db.refreshToken.findUnique({
      where: { tokenHash },
      select: { revokedAt: true },
    });
    if (!token) return true; // not found = treat as revoked
    return token.revokedAt !== null;
  }
}
