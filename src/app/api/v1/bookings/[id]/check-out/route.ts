import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";

async function getBookingService() {
  const { bookingService } = await import("@modules/booking/container");
  return bookingService;
}

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/bookings/:id/check-out
export const POST = withPermission("booking", "update", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = await getBookingService();
    const updated = await svc.checkOut(id, user.id, user.organizationId ?? "");
    return successResponse(updated);
  } catch (error) {
    return handleRouteError(error);
  }
});
