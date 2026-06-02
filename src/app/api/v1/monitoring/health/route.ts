import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";

// GET /api/v1/monitoring/health — public endpoint, no auth required
export async function GET(_req: NextRequest) {
  try {
    const { monitoringService } = await import("@modules/monitoring/container");
    const status = await monitoringService.getSystemStatus();
    const httpStatus = status.overall === "DOWN" ? 503 : status.overall === "DEGRADED" ? 207 : 200;
    return successResponse(status, httpStatus);
  } catch (error) {
    return handleRouteError(error);
  }
}
