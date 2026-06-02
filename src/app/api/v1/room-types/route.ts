import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

async function getRoomTypeService() {
  const { roomTypeService } = await import("@modules/room/container");
  return roomTypeService;
}
async function getValidators() {
  return import("@modules/room/validators");
}

// GET /api/v1/room-types?hotelId=X&status=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await getValidators();
    const params = v.validateRoomTypeFilter(Object.fromEntries(req.nextUrl.searchParams));
    const svc = await getRoomTypeService();
    const result = await svc.listRoomTypes(user.organizationId ?? "", params);
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/room-types
export const POST = withPermission("room", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateCreateRoomType(body);
    const svc = await getRoomTypeService();
    const roomType = await svc.createRoomType(dto, user.organizationId ?? "");
    return successResponse(roomType, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
