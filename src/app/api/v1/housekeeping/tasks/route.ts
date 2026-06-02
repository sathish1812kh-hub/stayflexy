import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/housekeeping/tasks?hotelId=&taskStatus=&priority=&assignedTo=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/housekeeping/validators");
    const filter = v.validateHousekeepingTaskFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { housekeepingService } = await import("@modules/housekeeping/container");
    const result = await housekeepingService.listTasks(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/housekeeping/tasks
export const POST = withPermission("housekeeping", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/housekeeping/validators");
    const dto = v.validateCreateHousekeepingTask(body);
    const { housekeepingService } = await import("@modules/housekeeping/container");
    const task = await housekeepingService.createTask(dto, user.id, user.organizationId ?? "");
    return successResponse(task, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
