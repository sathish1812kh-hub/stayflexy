import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/jobs?jobType=&jobStatus=&page=&limit=
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const v = await import("@modules/jobs/validators");
    const filter = v.validateJobFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { jobService } = await import("@modules/jobs/container");
    const result = await jobService.listJobs(filter);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/jobs
export const POST = withPermission("jobs", "create", async (req: NextRequest) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/jobs/validators");
    const dto = v.validateCreateJob(body);
    const { jobService } = await import("@modules/jobs/container");
    const job = await jobService.createJob(dto);
    return successResponse(job, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
