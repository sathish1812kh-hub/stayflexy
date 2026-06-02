import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";

// GET /api/v1/compliance/audit-retention
export const GET = withPermission("compliance", "read", async (_req: NextRequest, _ctx) => {
  try {
    const { complianceService } = await import("@modules/compliance/container");
    const summary = complianceService.getRetentionSummary();
    return successResponse(summary);
  } catch (error) {
    return handleRouteError(error);
  }
});
