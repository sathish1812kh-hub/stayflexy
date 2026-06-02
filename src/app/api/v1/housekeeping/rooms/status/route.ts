import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

// GET /api/v1/housekeeping/rooms/status?hotelId=&floor=&housekeepingStatus=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/housekeeping/validators");
    const filter = v.validateRoomStatusFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { housekeepingService } = await import("@modules/housekeeping/container");
    const statuses = await housekeepingService.getRoomStatuses(filter, user.organizationId ?? "");
    return successResponse(statuses);
  } catch (error) {
    return handleRouteError(error);
  }
});
