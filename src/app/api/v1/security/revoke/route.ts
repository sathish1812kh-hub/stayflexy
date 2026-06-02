import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// POST /api/v1/security/revoke  { sessionId }
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/security/validators");
    const dto = v.validateRevokeSession(body);
    const { userSessionService } = await import("@modules/security/container");
    await userSessionService.revokeSession(dto.sessionId, user.id);
    return successResponse({ revoked: true });
  } catch (error) {
    return handleRouteError(error);
  }
});
