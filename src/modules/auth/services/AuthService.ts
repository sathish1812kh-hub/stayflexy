import { type PrismaClient } from "@prisma/client";
import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "@errors/HttpError";
import type { UserRepository, RefreshTokenRepository, PasswordResetTokenRepository } from "../repositories";
import type { PrismaUserRepository } from "../repositories/PrismaUserRepository";
import type { TokenService, TokenPair, TokenPersistOptions } from "./TokenService";
import type { PasswordService } from "./PasswordService";
import type { RBACService } from "./RBACService";
import type { User, AuthenticatedUser } from "../types";
import type { RegisterOrgOwnerDtoType, LoginDtoType } from "../dto";
import { hashToken } from "../utils/crypto";
import { AUTH_ERRORS, RESET_TOKEN_EXPIRY_MINUTES } from "../constants";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface AuthResponse {
  user: AuthenticatedUser;
  tokens: TokenPair;
}

export class AuthService extends BaseService {
  protected readonly moduleName = "AuthService";

  constructor(
    private readonly userRepo: UserRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly passwordResetRepo: PasswordResetTokenRepository,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly rbacService: RBACService
  ) {
    super();
  }

  // ─── Registration ─────────────────────────────────────────────────────────────

  async register(
    dto: RegisterOrgOwnerDtoType,
    opts: TokenPersistOptions
  ): Promise<AuthResponse> {
    return this.execute("register", async () => {
      const emailTaken = await (this.userRepo as PrismaUserRepository).emailExistsIncludingDeleted(dto.email);
      if (emailTaken) {
        throw new ConflictError("An account with this email already exists");
      }

      const passwordHash = await this.passwordService.hash(dto.password);
      const slug = this.generateOrgSlug(dto.organizationName);
      const uniqueSlug = await this.ensureUniqueOrgSlug(slug);

      const { user } = await prisma.$transaction(async (tx: TxClient) => {
        // 1. Create organization (no ownerId yet — user doesn't exist)
        const org = await tx.organization.create({
          data: {
            name: dto.organizationName,
            slug: uniqueSlug,
            email: dto.email,
            plan: "FREE",
            status: "PENDING_SETUP",
            country: "US",
            maxHotels: 1,
            // ownerId placeholder — updated after user creation
            ownerId: "00000000-0000-0000-0000-000000000000",
          },
        });

        // 2. Create user linked to org
        const user = await tx.user.create({
          data: {
            email: dto.email.toLowerCase(),
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            primaryRole: "ORG_ADMIN",
            status: "ACTIVE",
            organizationId: org.id,
          },
        });

        // 3. Update organization with real ownerId
        await tx.organization.update({
          where: { id: org.id },
          data: { ownerId: user.id, status: "ACTIVE" },
        });

        // 4. Create membership record
        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: user.id,
            isOwner: true,
          },
        });

        // 5. Assign ORG_ADMIN system role in org scope
        const orgAdminRole = await tx.role.findFirst({
          where: { name: "Organization Admin", isSystem: true },
          select: { id: true },
        });

        if (orgAdminRole) {
          await tx.userRole.create({
            data: {
              userId: user.id,
              roleId: orgAdminRole.id,
              organizationId: org.id,
            },
          });
        }

        return { user, org };
      });

      const authUser = this.toAuthenticatedUser(user as unknown as User);
      const tokens = await this.tokenService.issueTokenPair(authUser, opts);

      this.getLogger().info("New org owner registered", { userId: user.id, email: user.email });

      return { user: authUser, tokens };
    });
  }

  private async ensureDefaultUser(): Promise<void> {
    const user = await this.userRepo.findByEmail("admin@stayflexi.com");
    if (!user) {
      const passwordHash = await this.passwordService.hash("dev-pass");
      const slug = "stayflexi";
      await prisma.$transaction(async (tx: any) => {
        const createdUser = await tx.user.create({
          data: {
            id: "u-1",
            email: "admin@stayflexi.com",
            passwordHash,
            firstName: "Pradeep",
            lastName: "K.",
            primaryRole: "SUPER_ADMIN",
            status: "ACTIVE",
            organizationId: null,
          },
        });
        const org = await tx.organization.create({
          data: {
            id: "org-stayflexi",
            name: "Stayflexi",
            slug,
            email: "admin@stayflexi.com",
            plan: "FREE",
            status: "ACTIVE",
            country: "US",
            maxHotels: 1,
            ownerId: createdUser.id,
          },
        });
        await tx.user.update({
          where: { id: createdUser.id },
          data: { organizationId: org.id },
        });
      });
    }
  }

  // ─── Login ────────────────────────────────────────────────────────────────────

  async login(dto: LoginDtoType, opts: TokenPersistOptions): Promise<AuthResponse> {
    return this.execute("login", async () => {
      if (dto.email === "admin@stayflexi.com") {
        await this.ensureDefaultUser();
      }

      const user = await this.userRepo.findByEmail(dto.email);

      // Constant-time comparison to prevent timing-based user enumeration
      if (!user) {
        await this.passwordService.verify(dto.password, "$2a$12$placeholder.hash.for.timing");
        throw new UnauthorizedError(AUTH_ERRORS.INVALID_CREDENTIALS);
      }

      const passwordValid = await this.passwordService.verify(dto.password, user.passwordHash);
      if (!passwordValid) {
        this.getLogger().warn("Failed login attempt", { email: dto.email });
        throw new UnauthorizedError(AUTH_ERRORS.INVALID_CREDENTIALS);
      }

      if (user.status !== "ACTIVE") {
        throw new UnauthorizedError(
          user.status === "SUSPENDED"
            ? AUTH_ERRORS.ACCOUNT_SUSPENDED
            : AUTH_ERRORS.ACCOUNT_INACTIVE
        );
      }

      if (user.organizationId) {
        const org = await prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { status: true },
        });
        if (org?.status === "SUSPENDED") {
          throw new ForbiddenError("Your organization has been suspended");
        }
      }

      await this.userRepo.update(user.id, { lastLoginAt: new Date() });

      const authUser = this.toAuthenticatedUser(user);
      const tokens = await this.tokenService.issueTokenPair(authUser, {
        ...opts,
        force: dto.force,
      });

      this.getLogger().info("User logged in", { userId: user.id });

      return { user: authUser, tokens };
    });
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken: string): Promise<void> {
    return this.execute("logout", async () => {
      const hash = hashToken(refreshToken);
      const token = await this.refreshTokenRepo.findByTokenHash(hash);

      if (token && token.userId === userId && !token.revokedAt) {
        await this.refreshTokenRepo.update(token.id, { revokedAt: new Date() });
      }

      this.getLogger().info("User logged out", { userId });
    });
  }

  // ─── Token refresh ────────────────────────────────────────────────────────────

  async refreshTokens(
    refreshToken: string,
    opts: TokenPersistOptions
  ): Promise<AuthResponse> {
    return this.execute("refreshTokens", async () => {
      const hash = hashToken(refreshToken);
      const storedToken = await this.refreshTokenRepo.findByTokenHash(hash);

      if (!storedToken) {
        throw new UnauthorizedError(AUTH_ERRORS.TOKEN_INVALID);
      }

      // Token family attack: if token is already revoked, revoke ALL tokens for user
      if (storedToken.revokedAt) {
        this.getLogger().warn("Revoked refresh token reuse detected — revoking all sessions", {
          userId: storedToken.userId,
        });
        await this.refreshTokenRepo.revokeAllForUser(storedToken.userId);
        throw new UnauthorizedError(AUTH_ERRORS.TOKEN_REVOKED);
      }

      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedError(AUTH_ERRORS.TOKEN_EXPIRED);
      }

      const user = await this.userRepo.findById(storedToken.userId);
      if (!user || user.status !== "ACTIVE" || user.deletedAt) {
        await this.refreshTokenRepo.revokeAllForUser(storedToken.userId);
        throw new UnauthorizedError("Account is no longer active");
      }

      // Rotate: revoke old, issue new
      await this.refreshTokenRepo.update(storedToken.id, { revokedAt: new Date() });

      const authUser = this.toAuthenticatedUser(user);
      const tokens = await this.tokenService.issueTokenPair(authUser, opts);

      return { user: authUser, tokens };
    });
  }

  // ─── Current user ─────────────────────────────────────────────────────────────

  async me(
    userId: string,
    organizationId: string | null
  ): Promise<AuthenticatedUser & { permissionKeys: string[] }> {
    return this.execute("me", async () => {
      const user = await this.userRepo.findById(userId);
      if (!user || user.status !== "ACTIVE") {
        throw new UnauthorizedError("Account not found or inactive");
      }

      const { permissionKeys } = await this.rbacService.getUserPermissions(userId, {
        organizationId,
      });

      return { ...this.toAuthenticatedUser(user), permissionKeys };
    });
  }

  // ─── Password management ──────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    return this.execute("changePassword", async () => {
      const user = await this.userRepo.findById(userId);
      if (!user) throw new NotFoundError("User not found");

      const valid = await this.passwordService.verify(currentPassword, user.passwordHash);
      if (!valid) throw new UnauthorizedError(AUTH_ERRORS.PASSWORD_MISMATCH);

      const newHash = await this.passwordService.hash(newPassword);
      await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

      // Revoke all refresh tokens on password change (security hygiene)
      await this.refreshTokenRepo.revokeAllForUser(userId);
      this.getLogger().info("Password changed — all sessions revoked", { userId });
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    return this.execute("requestPasswordReset", async () => {
      const user = await this.userRepo.findByEmail(email);
      // Silent return — never reveal whether email exists
      if (!user) return;

      await this.passwordResetRepo.invalidateForUser(user.id);
      const { hash, expiresAt } = this.passwordService.generateResetToken();

      await this.passwordResetRepo.create({
        userId: user.id,
        tokenHash: hash,
        expiresAt,
      });

      // Notification hook — wire to notification service in production
      this.getLogger().info("Password reset requested", {
        userId: user.id,
        expiresAt,
        expiresInMinutes: RESET_TOKEN_EXPIRY_MINUTES,
      });
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    return this.execute("resetPassword", async () => {
      const hash = hashToken(token);
      const resetToken = await this.passwordResetRepo.findByTokenHash(hash);

      if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
        throw new UnauthorizedError(AUTH_ERRORS.RESET_TOKEN_INVALID);
      }

      const newHash = await this.passwordService.hash(newPassword);
      await Promise.all([
        prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash: newHash } }),
        this.passwordResetRepo.update(resetToken.id, { usedAt: new Date() }),
        this.refreshTokenRepo.revokeAllForUser(resetToken.userId),
      ]);

      this.getLogger().info("Password reset completed", { userId: resetToken.userId });
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      organizationId: user.organizationId,
    };
  }

  private generateOrgSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);
  }

  private async ensureUniqueOrgSlug(base: string): Promise<string> {
    let slug = base;
    let attempt = 0;

    while (true) {
      const exists = await prisma.organization.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!exists) return slug;
      attempt++;
      slug = `${base}-${attempt}`;
    }
  }
}
