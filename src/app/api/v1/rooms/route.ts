import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

async function getRoomService() {
  const { roomService } = await import("@modules/room/container");
  return roomService;
}
async function getValidators() {
  return import("@modules/room/validators");
}

// GET /api/v1/rooms?hotelId=X&roomTypeId=&operationalStatus=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await getValidators();
    const params = v.validateRoomFilter(Object.fromEntries(req.nextUrl.searchParams));
    const svc = await getRoomService();
    const result = await svc.listRooms(params.hotelId, user.organizationId ?? "", params);
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/rooms
export const POST = withPermission("room", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateCreateRoom(body);
    const svc = await getRoomService();
    const room = await svc.createRoom(dto, user.organizationId ?? "");
    return successResponse(room, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
