import { type NextRequest } from "next/server";
import { AuthController } from "../controllers";
import type { AuthService } from "../services";

export function createAuthRoutes(authService: AuthService) {
  const controller = new AuthController(authService);

  return {
    "POST /login": (req: NextRequest) => controller.login(req),
    "POST /register": (req: NextRequest) => controller.register(req),
    "POST /refresh": (req: NextRequest) => controller.refreshTokens(req),
    "POST /logout": (req: NextRequest) => controller.logout(req),
    "POST /change-password": (req: NextRequest) => controller.changePassword(req),
    "POST /forgot-password": (req: NextRequest) => controller.requestPasswordReset(req),
    "POST /reset-password": (req: NextRequest) => controller.resetPassword(req),
  };
}
