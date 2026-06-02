import type { Nullable } from "@shared-types";

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: Nullable<string>;
  iat: number;
  exp: number;
}

export interface IAuthService {
  login(email: string, password: string): Promise<AuthTokenPair>;
  logout(userId: string, refreshToken: string): Promise<void>;
  refreshTokens(refreshToken: string): Promise<AuthTokenPair>;
  verifyAccessToken(token: string): Promise<JwtPayload>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}
