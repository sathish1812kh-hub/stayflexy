import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/operations/tasks?hotelId=&taskStatus=&priority=&assignedTo=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/operations/validators");
    const filter = v.validateOperationalTaskFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { operationsService } = await import("@modules/operations/container");
    const result = await operationsService.listTasks(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/operations/tasks
export const POST = withPermission("operations", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/operations/validators");
    const dto = v.validateCreateOperationalTask(body);
    const { operationsService } = await import("@modules/operations/container");
    const task = await operationsService.createTask(dto, user.id, user.organizationId ?? "");
    return successResponse(task, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
