import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/resilience/health
export const GET = withAuth(async (_req: NextRequest, _ctx) => {
  try {
    const { healthMonitor } = await import("@modules/resilience/container");
    const health = await healthMonitor.check();
    const statusCode = health.overall === "healthy" ? 200 : health.overall === "degraded" ? 207 : 503;
    return successResponse(health, statusCode);
  } catch (error) {
    return handleRouteError(error);
  }
});
