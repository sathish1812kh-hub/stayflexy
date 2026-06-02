import { type Prisma } from "@prisma/client";
import { PasswordResetTokenRepository, type CreatePasswordResetTokenInput } from "./index";
import type { PasswordResetToken } from "../types";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";

type PrismaPasswordResetToken = Prisma.PasswordResetTokenGetPayload<Record<string, never>>;

function toPasswordResetToken(r: PrismaPasswordResetToken): PasswordResetToken {
  return {
    id: r.id,
    userId: r.userId,
    tokenHash: r.tokenHash,
    expiresAt: r.expiresAt,
    usedAt: r.usedAt,
    createdAt: r.createdAt,
  };
}

export class PrismaPasswordResetTokenRepository extends PasswordResetTokenRepository {
  async findById(id: string): Promise<Nullable<PasswordResetToken>> {
    const r = await this.db.passwordResetToken.findUnique({ where: { id } });
    return r ? toPasswordResetToken(r) : null;
  }

  async findByTokenHash(hash: string): Promise<Nullable<PasswordResetToken>> {
    const r = await this.db.passwordResetToken.findUnique({ where: { tokenHash: hash } });
    return r ? toPasswordResetToken(r) : null;
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<PasswordResetToken>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.passwordResetToken.findMany({ skip, take: params.limit }),
      this.db.passwordResetToken.count(),
    ]);
    return { data: records.map(toPasswordResetToken), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreatePasswordResetTokenInput): Promise<PasswordResetToken> {
    const r = await this.db.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
    return toPasswordResetToken(r);
  }

  async update(id: string, data: { usedAt: Date }): Promise<PasswordResetToken> {
    const r = await this.db.passwordResetToken.update({
      where: { id },
      data: { usedAt: data.usedAt },
    });
    return toPasswordResetToken(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.passwordResetToken.delete({ where: { id } });
  }

  async invalidateForUser(userId: string): Promise<void> {
    // Marks all unused tokens as used (invalidates without deleting)
    await this.db.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
