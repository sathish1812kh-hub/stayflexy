import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";
import { validateRefreshToken } from "@modules/auth/validators";
import { authService } from "@modules/auth/container";

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const dto = validateRefreshToken(body);
    await authService.logout(user.id, dto.refreshToken);
    return successResponse({ message: "Logged out successfully" });
  } catch (error) {
    return handleRouteError(error);
  }
});
