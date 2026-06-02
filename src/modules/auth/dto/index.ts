import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../constants";

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// ─── Auth DTOs ─────────────────────────────────────────────────────────────────

export const RegisterOrgOwnerDto = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required").max(100).trim(),
  lastName: z.string().min(1, "Last name is required").max(100).trim(),
  organizationName: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(200)
    .trim(),
});

export const LoginDto = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
  force: z.boolean().optional(),
});

export const RefreshTokenDto = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const ChangePasswordDto = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const RequestPasswordResetDto = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

export const ResetPasswordDto = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});

// ─── RBAC DTOs ─────────────────────────────────────────────────────────────────

export const CreateRoleDto = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  organizationId: z.string().uuid("Invalid organization ID").optional(),
});

export const UpdateRoleDto = CreateRoleDto.partial().omit({ organizationId: true });

export const AssignRoleDto = z.object({
  userId: z.string().uuid("Invalid user ID"),
  roleId: z.string().uuid("Invalid role ID"),
  organizationId: z.string().uuid("Invalid organization ID").optional(),
  hotelId: z.string().uuid("Invalid hotel ID").optional(),
  expiresAt: z.string().datetime("Invalid expiration date").optional(),
});

export const RevokeRoleDto = z.object({
  userId: z.string().uuid("Invalid user ID"),
  userRoleId: z.string().uuid("Invalid user role ID"),
});

export const CreatePermissionDto = z.object({
  resource: z
    .string()
    .min(1)
    .max(100)
    .toLowerCase()
    .regex(/^[a-z_]+$/, "Resource must be lowercase letters and underscores only"),
  action: z
    .string()
    .min(1)
    .max(100)
    .toLowerCase()
    .regex(/^[a-z_]+$/, "Action must be lowercase letters and underscores only"),
  description: z.string().max(500).optional(),
});

export const AssignPermissionToRoleDto = z.object({
  roleId: z.string().uuid("Invalid role ID"),
  permissionId: z.string().uuid("Invalid permission ID"),
});

export const CheckPermissionDto = z.object({
  resource: z.string().min(1).max(100),
  action: z.string().min(1).max(100),
  organizationId: z.string().uuid().optional(),
  hotelId: z.string().uuid().optional(),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type RegisterOrgOwnerDtoType = z.infer<typeof RegisterOrgOwnerDto>;
export type LoginDtoType = z.infer<typeof LoginDto>;
export type RefreshTokenDtoType = z.infer<typeof RefreshTokenDto>;
export type ChangePasswordDtoType = z.infer<typeof ChangePasswordDto>;
export type RequestPasswordResetDtoType = z.infer<typeof RequestPasswordResetDto>;
export type ResetPasswordDtoType = z.infer<typeof ResetPasswordDto>;
export type CreateRoleDtoType = z.infer<typeof CreateRoleDto>;
export type AssignRoleDtoType = z.infer<typeof AssignRoleDto>;
export type RevokeRoleDtoType = z.infer<typeof RevokeRoleDto>;
export type CreatePermissionDtoType = z.infer<typeof CreatePermissionDto>;
export type AssignPermissionToRoleDtoType = z.infer<typeof AssignPermissionToRoleDto>;
export type CheckPermissionDtoType = z.infer<typeof CheckPermissionDto>;
