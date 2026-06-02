import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/audit/entities/:id?entityType=Booking
// Returns the full audit history for a specific entity
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const entityType = req.nextUrl.searchParams.get("entityType") ?? "";
    const { auditService } = await import("@modules/audit/container");
    const logs = await auditService.getEntityHistory(entityType, id, user.organizationId ?? "");
    return successResponse(logs);
  } catch (error) {
    return handleRouteError(error);
  }
});
