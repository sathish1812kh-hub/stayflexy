import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/security/activity?userId=&eventType=&severity=&startDate=&endDate=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const filter = { ...params, organizationId: params["organizationId"] ?? user.organizationId ?? undefined };
    const v = await import("@modules/security/validators");
    const dto = v.validateSecurityEventFilter(filter);
    const { securityEventService } = await import("@modules/security/container");
    const result = await securityEventService.listEvents(dto);
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
