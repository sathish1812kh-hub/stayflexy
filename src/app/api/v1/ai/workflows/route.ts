import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/ai/workflows — list built-in workflow definitions
export const GET = withAuth(async (_req: NextRequest) => {
  try {
    const { workflowEngineService } = await import("@modules/workflow-engine/container");
    const definitions = workflowEngineService.listDefinitions();
    return successResponse(definitions);
  } catch (error) {
    return handleRouteError(error);
  }
});
