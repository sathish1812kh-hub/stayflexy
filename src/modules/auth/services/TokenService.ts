import { BaseService } from "@lib/baseService";
import {
  generateAccessToken,
  verifyAccessToken,
  getAccessTokenExpiresIn,
  type AccessTokenPayload,
} from "../utils/jwt";
import { generateRefreshToken, hashToken, type RefreshTokenPair } from "../utils/crypto";
import type { RefreshTokenRepository } from "../repositories";
import type { User } from "../types";

import { ForbiddenError } from "@errors/HttpError";
import { prisma } from "@lib/prisma";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPersistOptions {
  ipAddress: string | null;
  userAgent: string | null;
}

export class TokenService extends BaseService {
  protected readonly moduleName = "TokenService";

  constructor(private readonly refreshTokenRepo: RefreshTokenRepository) {
    super();
  }

  generateAccessToken(user: Pick<User, "id" | "email" | "role" | "organizationId">, sid: string): string {
    return generateAccessToken(user.id, user.email, user.role, user.organizationId, sid);
  }

  generateRefreshTokenPair(): RefreshTokenPair {
    return generateRefreshToken();
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return verifyAccessToken(token);
  }

  hashRefreshToken(plaintext: string): string {
    return hashToken(plaintext);
  }

  getAccessTokenExpiresIn(): number {
    return getAccessTokenExpiresIn();
  }

  async issueTokenPair(
    user: Pick<User, "id" | "email" | "role" | "organizationId">,
    opts: TokenPersistOptions & { force?: boolean }
  ): Promise<TokenPair> {
    return this.execute("issueTokenPair", async () => {
      // If force option is selected, revoke all existing active sessions first
      if (opts.force) {
        await prisma.refreshToken.updateMany({
          where: {
            userId: user.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });
        await prisma.securityEvent.deleteMany({
          where: {
            userId: user.id,
            eventType: "SESSION_HIJACK_ATTEMPT",
          },
        });
      }

      // Check active refresh tokens in database
      const activeCount = await prisma.refreshToken.count({
        where: {
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (activeCount >= 3) {
        // Log a security event of type SESSION_HIJACK_ATTEMPT with high severity to trigger front-end warnings
        await prisma.securityEvent.create({
          data: {
            userId: user.id,
            organizationId: user.organizationId,
            eventType: "SESSION_HIJACK_ATTEMPT",
            severity: "HIGH",
            ipAddress: opts.ipAddress,
            userAgent: opts.userAgent,
            metadata: {
              message: `A 4th device from IP ${opts.ipAddress || "unknown"} tried to log in but was blocked.`,
              timestamp: new Date().toISOString(),
            },
          },
        });
        throw new ForbiddenError(
          "Maximum device limit reached. You can only be logged in on up to 3 devices simultaneously."
        );
      }

      const { plaintext, hash, expiresAt } = this.generateRefreshTokenPair();

      const createdToken = await this.refreshTokenRepo.create({
        userId: user.id,
        tokenHash: hash,
        expiresAt,
        ipAddress: opts.ipAddress,
        userAgent: opts.userAgent,
      });

      const accessToken = this.generateAccessToken(user, createdToken.id);

      return {
        accessToken,
        refreshToken: plaintext,
        expiresIn: this.getAccessTokenExpiresIn(),
      };
    });
  }

  async rotateRefreshToken(
    oldTokenHash: string,
    tokenId: string,
    user: Pick<User, "id" | "email" | "role" | "organizationId">,
    opts: TokenPersistOptions
  ): Promise<TokenPair> {
    return this.execute("rotateRefreshToken", async () => {
      // Revoke old token
      await this.refreshTokenRepo.update(tokenId, { revokedAt: new Date() });

      // Issue new pair
      return this.issueTokenPair(user, opts);
    });
  }
}
