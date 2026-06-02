import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/jobs/:id
export const GET = withAuth(async (req: NextRequest, { user: _user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const { jobService } = await import("@modules/jobs/container");
    const job = await jobService.getJob(id);
    return successResponse(job);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/jobs/:id/execute — triggers immediate job execution
export const POST = withPermission("jobs", "update", async (req: NextRequest, { user: _user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const { jobService } = await import("@modules/jobs/container");
    const job = await jobService.executeJob(id);
    return successResponse(job);
  } catch (error) {
    return handleRouteError(error);
  }
});
