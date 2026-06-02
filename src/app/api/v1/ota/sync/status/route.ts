import { type NextRequest } from "next/server";
import { paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/ota/sync/status?hotelId=&providerId=&syncType=&syncStatus=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/synchronization/validators");
    const filter = v.validateSyncJobFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { syncJobService } = await import("@modules/synchronization/container");
    const result = await syncJobService.listSyncJobs(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});
