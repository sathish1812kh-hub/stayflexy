import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";
import { authService } from "@modules/auth/container";

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  try {
    const profile = await authService.me(user.id, user.organizationId);
    return successResponse(profile);
  } catch (error) {
    return handleRouteError(error);
  }
});
