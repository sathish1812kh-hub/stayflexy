/**
 * Lightweight service container for the auth module.
 * Composes and exposes singleton instances of all auth services.
 * Replace with a DI container (Inversify/tsyringe) when scaling.
 */
import { PrismaUserRepository } from "./repositories/PrismaUserRepository";
import { PrismaRefreshTokenRepository } from "./repositories/PrismaRefreshTokenRepository";
import { PrismaPasswordResetTokenRepository } from "./repositories/PrismaPasswordResetTokenRepository";
import { PasswordService } from "./services/PasswordService";
import { TokenService } from "./services/TokenService";
import { RBACService } from "./services/RBACService";
import { AuthService } from "./services/AuthService";

const userRepo = new PrismaUserRepository();
const refreshTokenRepo = new PrismaRefreshTokenRepository();
const passwordResetRepo = new PrismaPasswordResetTokenRepository();

export const passwordService = new PasswordService();
export const tokenService = new TokenService(refreshTokenRepo);
export const rbacService = new RBACService();

export const authService = new AuthService(
  userRepo,
  refreshTokenRepo,
  passwordResetRepo,
  tokenService,
  passwordService,
  rbacService
);

export { userRepo, refreshTokenRepo, passwordResetRepo };
