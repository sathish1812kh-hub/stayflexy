import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/operations/staff/workload?hotelId=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/operations/validators");
    const dto = v.validateWorkloadQuery(Object.fromEntries(req.nextUrl.searchParams));
    const { operationsService } = await import("@modules/operations/container");
    const summary = await operationsService.getStaffWorkload(dto, user.organizationId ?? "");
    return successResponse(summary);
  } catch (error) {
    return handleRouteError(error);
  }
});
