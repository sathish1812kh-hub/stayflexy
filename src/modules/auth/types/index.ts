import type { Nullable, TimestampFields } from "@shared-types";

export type UserRole =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "HOTEL_MANAGER"
  | "FRONT_DESK"
  | "HOUSEKEEPING"
  | "ACCOUNTANT";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";

export interface User extends TimestampFields {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  organizationId: Nullable<string>;
  lastLoginAt: Nullable<Date>;
  emailVerifiedAt: Nullable<Date>;
  deletedAt: Nullable<Date>;
}

export interface RefreshToken extends TimestampFields {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Nullable<Date>;
  ipAddress: Nullable<string>;
  userAgent: Nullable<string>;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Nullable<Date>;
  createdAt: Date;
}

// Minimal public representation sent over the wire — no secrets, no audit fields
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  organizationId: Nullable<string>;
}
