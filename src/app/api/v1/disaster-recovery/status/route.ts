import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";

// GET /api/v1/disaster-recovery/status
export const GET = withPermission("disaster-recovery", "read", async (_req: NextRequest, _ctx) => {
  try {
    const { disasterRecoveryService } = await import("@modules/disaster-recovery/container");
    const status = await disasterRecoveryService.getSystemStatus();
    return successResponse(status);
  } catch (error) {
    return handleRouteError(error);
  }
});
