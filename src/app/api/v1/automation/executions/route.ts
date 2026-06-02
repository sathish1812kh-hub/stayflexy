import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/automation/executions?hotelId=&workflowName=&executionStatus=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/automation/validators");
    const filter = v.validateExecutionFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { workflowExecutionService } = await import("@modules/automation/container");
    const result = await workflowExecutionService.listExecutions(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/automation/executions — manually trigger a workflow rule
export const POST = withPermission("automation", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/automation/validators");
    const dto = v.validateTriggerWorkflow(body);
    const { workflowExecutionService } = await import("@modules/automation/container");
    const execution = await workflowExecutionService.triggerRule(dto, user.id, user.organizationId ?? "");
    return successResponse(execution, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
