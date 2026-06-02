import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/housekeeping/tasks/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const { housekeepingService } = await import("@modules/housekeeping/container");
    const task = await housekeepingService.getTask(id, user.organizationId ?? "");
    return successResponse(task);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/housekeeping/tasks/:id
export const PATCH = withPermission("housekeeping", "update", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await import("@modules/housekeeping/validators");

    // Detect if this is a status update or a field update
    const bodyObj = body as Record<string, unknown>;
    if ("taskStatus" in bodyObj) {
      const dto = v.validateUpdateTaskStatus(body);
      const { housekeepingService } = await import("@modules/housekeeping/container");
      const task = await housekeepingService.updateTaskStatus(id, dto, user.id, user.organizationId ?? "");
      return successResponse(task);
    }

    const dto = v.validateUpdateHousekeepingTask(body);
    const { housekeepingService } = await import("@modules/housekeeping/container");
    const task = await housekeepingService.updateTask(id, dto, user.id, user.organizationId ?? "");
    return successResponse(task);
  } catch (error) {
    return handleRouteError(error);
  }
});
