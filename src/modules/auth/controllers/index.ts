import { type NextRequest } from "next/server";
import { successResponse, createdResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import {
  validateRegisterOrgOwner,
  validateLogin,
  validateRefreshToken,
  validateChangePassword,
  validateRequestPasswordReset,
  validateResetPassword,
} from "../validators";
import type { AuthService } from "../services/AuthService";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(req: NextRequest) {
    try {
      const body = await req.json() as unknown;
      const dto = validateRegisterOrgOwner(body);
      const result = await this.authService.register(dto, {
        ipAddress: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
      });
      return createdResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async login(req: NextRequest) {
    try {
      const body = await req.json() as unknown;
      const dto = validateLogin(body);
      const result = await this.authService.login(dto, {
        ipAddress: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
      });
      return successResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async refreshTokens(req: NextRequest) {
    try {
      const body = await req.json() as unknown;
      const dto = validateRefreshToken(body);
      const result = await this.authService.refreshTokens(dto.refreshToken, {
        ipAddress: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
      });
      return successResponse(result);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async logout(req: NextRequest) {
    try {
      const body = await req.json() as unknown;
      const dto = validateRefreshToken(body);
      const userId = req.headers.get("x-user-id") ?? "";
      await this.authService.logout(userId, dto.refreshToken);
      return successResponse({ message: "Logged out successfully" });
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async changePassword(req: NextRequest) {
    try {
      const body = await req.json() as unknown;
      const dto = validateChangePassword(body);
      const userId = req.headers.get("x-user-id") ?? "";
      await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
      return successResponse({ message: "Password changed successfully" });
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async requestPasswordReset(req: NextRequest) {
    try {
      const body = await req.json() as unknown;
      const dto = validateRequestPasswordReset(body);
      await this.authService.requestPasswordReset(dto.email);
      return successResponse({ message: "If that email exists, a reset link has been sent" });
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async resetPassword(req: NextRequest) {
    try {
      const body = await req.json() as unknown;
      const dto = validateResetPassword(body);
      await this.authService.resetPassword(dto.token, dto.newPassword);
      return successResponse({ message: "Password reset successfully" });
    } catch (error) {
      return handleRouteError(error);
    }
  }
}
