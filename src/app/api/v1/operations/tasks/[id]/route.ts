import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/operations/tasks/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const { operationsService } = await import("@modules/operations/container");
    const task = await operationsService.getTask(id, user.organizationId ?? "");
    return successResponse(task);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/operations/tasks/:id
export const PATCH = withPermission("operations", "update", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await import("@modules/operations/validators");

    const bodyObj = body as Record<string, unknown>;
    if ("taskStatus" in bodyObj) {
      const dto = v.validateUpdateOperationalTaskStatus(body);
      const { operationsService } = await import("@modules/operations/container");
      const task = await operationsService.updateTaskStatus(id, dto, user.id, user.organizationId ?? "");
      return successResponse(task);
    }

    const dto = v.validateUpdateOperationalTask(body);
    const { operationsService } = await import("@modules/operations/container");
    const task = await operationsService.updateTask(id, dto, user.id, user.organizationId ?? "");
    return successResponse(task);
  } catch (error) {
    return handleRouteError(error);
  }
});
