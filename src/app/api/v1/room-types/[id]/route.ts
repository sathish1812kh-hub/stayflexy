import { type NextRequest } from "next/server";
import { successResponse, noContentResponse, errorResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

async function getRoomTypeService() {
  const { roomTypeService } = await import("@modules/room/container");
  return roomTypeService;
}
async function getValidators() {
  return import("@modules/room/validators");
}

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/room-types/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = await getRoomTypeService();
    const rt = await svc.findById(id);
    if (!rt) return errorResponse("NOT_FOUND", "Room type not found", 404);
    if (user.role !== "SUPER_ADMIN" && rt.organizationId !== user.organizationId) {
      return errorResponse("NOT_FOUND", "Room type not found", 404);
    }
    return successResponse(rt);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/room-types/:id
export const PATCH = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateUpdateRoomType(body);
    const svc = await getRoomTypeService();
    const updated = await svc.updateRoomType(id, dto, user.organizationId ?? "");
    return successResponse(updated);
  } catch (error) {
    return handleRouteError(error);
  }
});

// DELETE /api/v1/room-types/:id
export const DELETE = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = await getRoomTypeService();
    await svc.deleteRoomType(id, user.organizationId ?? "");
    return noContentResponse();
  } catch (error) {
    return handleRouteError(error);
  }
});
