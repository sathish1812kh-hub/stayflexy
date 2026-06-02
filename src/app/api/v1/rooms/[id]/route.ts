import { type NextRequest } from "next/server";
import { successResponse, noContentResponse, errorResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

async function getRoomService() {
  const { roomService } = await import("@modules/room/container");
  return roomService;
}
async function getValidators() {
  return import("@modules/room/validators");
}

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/rooms/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = await getRoomService();
    const room = await svc.findById(id);
    if (!room) return errorResponse("NOT_FOUND", "Room not found", 404);
    if (user.role !== "SUPER_ADMIN" && room.organizationId !== user.organizationId) {
      return errorResponse("NOT_FOUND", "Room not found", 404);
    }
    return successResponse(room);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/rooms/:id
export const PATCH = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateUpdateRoom(body);
    const svc = await getRoomService();
    const updated = await svc.updateRoom(id, dto, user.organizationId ?? "");
    return successResponse(updated);
  } catch (error) {
    return handleRouteError(error);
  }
});

// DELETE /api/v1/rooms/:id
export const DELETE = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = await getRoomService();
    await svc.deleteRoom(id, user.organizationId ?? "");
    return noContentResponse();
  } catch (error) {
    return handleRouteError(error);
  }
});
