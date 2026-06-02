import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/security/sessions?userId=&sessionStatus=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    // Scope to the caller's org; admins may pass userId, non-admins see only their own
    const filter = {
      ...params,
      organizationId: user.organizationId ?? undefined,
      userId: params["userId"] ?? user.id,
    };
    const v = await import("@modules/security/validators");
    const dto = v.validateSessionFilter(filter);
    const { userSessionService } = await import("@modules/security/container");
    const result = await userSessionService.listSessions(dto);
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
