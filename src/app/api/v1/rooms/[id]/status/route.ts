import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";
import type { RoomOperationalStatus, HousekeepingStatus } from "@modules/room/types";

async function getRoomService() {
  const { roomService } = await import("@modules/room/container");
  return roomService;
}
async function getValidators() {
  return import("@modules/room/validators");
}

type Params = { params: Promise<{ id: string }> };

// PATCH /api/v1/rooms/:id/status
// Accepts either { operationalStatus } or { housekeepingStatus } in the body
export const PATCH = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await getValidators();
    const bodyObj = body as Record<string, unknown>;
    const svc = await getRoomService();

    if ("housekeepingStatus" in bodyObj) {
      const dto = v.validateUpdateHousekeepingStatus(body);
      const updated = await svc.updateHousekeepingStatus(
        id,
        dto.housekeepingStatus as HousekeepingStatus,
        user.organizationId ?? ""
      );
      return successResponse(updated);
    }

    const dto = v.validateUpdateRoomStatus(body);
    const updated = await svc.updateOperationalStatus(
      id,
      dto.operationalStatus as RoomOperationalStatus,
      user.organizationId ?? ""
    );
    return successResponse(updated);
  } catch (error) {
    return handleRouteError(error);
  }
});
