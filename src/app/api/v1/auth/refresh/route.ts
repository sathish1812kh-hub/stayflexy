import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { validateRefreshToken } from "@modules/auth/validators";
import { authService } from "@modules/auth/container";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown;
    const dto = validateRefreshToken(body);

    const { user, tokens } = await authService.refreshTokens(dto.refreshToken, {
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    });

    return successResponse({ user, tokens });
  } catch (error) {
    return handleRouteError(error);
  }
}
