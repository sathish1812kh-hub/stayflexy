import { ZodError, type ZodSchema } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  RegisterOrgOwnerDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  CreateRoleDto,
  AssignRoleDto,
  RevokeRoleDto,
  CreatePermissionDto,
  AssignPermissionToRoleDto,
  CheckPermissionDto,
  type RegisterOrgOwnerDtoType,
  type LoginDtoType,
  type RefreshTokenDtoType,
  type ChangePasswordDtoType,
  type RequestPasswordResetDtoType,
  type ResetPasswordDtoType,
  type CreateRoleDtoType,
  type AssignRoleDtoType,
  type RevokeRoleDtoType,
  type CreatePermissionDtoType,
  type AssignPermissionToRoleDtoType,
  type CheckPermissionDtoType,
} from "../dto";

function parse<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

export function validateRegisterOrgOwner(data: unknown): RegisterOrgOwnerDtoType {
  return parse(RegisterOrgOwnerDto, data);
}

export function validateLogin(data: unknown): LoginDtoType {
  return parse(LoginDto, data);
}

export function validateRefreshToken(data: unknown): RefreshTokenDtoType {
  return parse(RefreshTokenDto, data);
}

export function validateChangePassword(data: unknown): ChangePasswordDtoType {
  return parse(ChangePasswordDto, data);
}

export function validateRequestPasswordReset(
  data: unknown
): RequestPasswordResetDtoType {
  return parse(RequestPasswordResetDto, data);
}

export function validateResetPassword(data: unknown): ResetPasswordDtoType {
  return parse(ResetPasswordDto, data);
}

export function validateCreateRole(data: unknown): CreateRoleDtoType {
  return parse(CreateRoleDto, data);
}

export function validateAssignRole(data: unknown): AssignRoleDtoType {
  return parse(AssignRoleDto, data);
}

export function validateRevokeRole(data: unknown): RevokeRoleDtoType {
  return parse(RevokeRoleDto, data);
}

export function validateCreatePermission(data: unknown): CreatePermissionDtoType {
  return parse(CreatePermissionDto, data);
}

export function validateAssignPermissionToRole(
  data: unknown
): AssignPermissionToRoleDtoType {
  return parse(AssignPermissionToRoleDto, data);
}

export function validateCheckPermission(data: unknown): CheckPermissionDtoType {
  return parse(CheckPermissionDto, data);
}
