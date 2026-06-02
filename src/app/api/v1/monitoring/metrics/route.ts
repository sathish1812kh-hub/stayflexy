import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/monitoring/metrics
export const GET = withAuth(async (_req: NextRequest) => {
  try {
    const { monitoringService } = await import("@modules/monitoring/container");
    const metrics = await monitoringService.getMetrics();
    return successResponse(metrics);
  } catch (error) {
    return handleRouteError(error);
  }
});
