import { type NextRequest } from "next/server";
import { paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/audit/logs?organizationId=&entityType=&actionType=&performedBy=&startDate=&endDate=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/audit/validators");
    const filter = v.validateAuditLogFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { auditService } = await import("@modules/audit/container");
    const result = await auditService.listLogs(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});
