import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";

// GET /api/v1/monitoring/status — lightweight liveness probe, no auth
export async function GET(_req: NextRequest) {
  try {
    return successResponse({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env["npm_package_version"] ?? "1.0.0",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
