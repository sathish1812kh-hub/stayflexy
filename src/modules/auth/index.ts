// Public API of the auth module
// Other modules must only import from this barrel — never from sub-paths

export type { User, RefreshToken, PasswordResetToken, UserRole, UserStatus, AuthenticatedUser } from "./types";
export { AUTH_ERRORS, BCRYPT_ROUNDS, ROLE_HIERARCHY, ROLES_ALLOWED_WITHOUT_ORG, RESET_TOKEN_EXPIRY_MINUTES } from "./constants";

// DTOs
export {
  RegisterOrgOwnerDto, LoginDto, RefreshTokenDto, ChangePasswordDto,
  CreateRoleDto, AssignRoleDto, CreatePermissionDto, AssignPermissionToRoleDto,
} from "./dto";
export type {
  RegisterOrgOwnerDtoType, LoginDtoType, RefreshTokenDtoType,
  CreateRoleDtoType, AssignRoleDtoType, CreatePermissionDtoType,
} from "./dto";

// Services
export { AuthService, TokenService, PasswordService, RBACService } from "./services";
export type { AuthResponse, TokenPair, TokenPersistOptions, RBACScope } from "./services";

// Middleware
export { withAuth, withRoles, withPermission, withSuperAdmin, withOrgAccess, extractBearerToken } from "./middleware";
export type { AuthContext, AuthzContext } from "./middleware";

// Utilities
export { generateAccessToken, verifyAccessToken, hashPassword, verifyPassword, generateRefreshToken, hashToken } from "./utils";
export type { AccessTokenPayload, RefreshTokenPair } from "./utils";

// Container (singleton services)
export { authService, tokenService, passwordService, rbacService } from "./container";

// Repositories (abstract types for DI)
export type { UserRepository, RefreshTokenRepository, PasswordResetTokenRepository, CreateUserInput, UpdateUserInput } from "./repositories";

// Concrete Prisma repositories
export { PrismaUserRepository } from "./repositories/PrismaUserRepository";
export { PrismaRefreshTokenRepository } from "./repositories/PrismaRefreshTokenRepository";
export { PrismaPasswordResetTokenRepository } from "./repositories/PrismaPasswordResetTokenRepository";
