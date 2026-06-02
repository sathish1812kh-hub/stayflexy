import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type { User, RefreshToken, PasswordResetToken } from "../types";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: User["role"];
  organizationId: Nullable<string>;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  role?: User["role"];
  status?: User["status"];
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
}

export abstract class UserRepository extends BaseRepository<User, CreateUserInput, UpdateUserInput> {
  abstract findByEmail(email: string): Promise<Nullable<User>>;
  abstract findByOrganization(organizationId: string, params: PaginationParams): Promise<PaginatedResult<User>>;
  abstract updateStatus(id: string, status: User["status"]): Promise<User>;
}

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress: Nullable<string>;
  userAgent: Nullable<string>;
}

export abstract class RefreshTokenRepository extends BaseRepository<
  RefreshToken, CreateRefreshTokenInput, { revokedAt: Date }
> {
  abstract findByTokenHash(hash: string): Promise<Nullable<RefreshToken>>;
  abstract revokeAllForUser(userId: string): Promise<void>;
  abstract deleteExpired(): Promise<number>;
}

export interface CreatePasswordResetTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export abstract class PasswordResetTokenRepository extends BaseRepository<
  PasswordResetToken, CreatePasswordResetTokenInput, { usedAt: Date }
> {
  abstract findByTokenHash(hash: string): Promise<Nullable<PasswordResetToken>>;
  abstract invalidateForUser(userId: string): Promise<void>;
}
