import type { UserRole } from "../types";

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid email or password",
  ACCOUNT_SUSPENDED: "Account is suspended. Contact your administrator",
  ACCOUNT_INACTIVE: "Account is inactive",
  EMAIL_NOT_VERIFIED: "Email address is not verified",
  TOKEN_EXPIRED: "Token has expired",
  TOKEN_INVALID: "Token is invalid",
  TOKEN_REVOKED: "Token has been revoked",
  PASSWORD_MISMATCH: "Current password is incorrect",
  RESET_TOKEN_INVALID: "Password reset token is invalid or expired",
} as const;

export const BCRYPT_ROUNDS = 12;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const RESET_TOKEN_EXPIRY_MINUTES = 60;
export const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ORG_ADMIN: 80,
  HOTEL_MANAGER: 60,
  FRONT_DESK: 40,
  ACCOUNTANT: 40,
  HOUSEKEEPING: 20,
};

export const ROLES_ALLOWED_WITHOUT_ORG: UserRole[] = ["SUPER_ADMIN"];
