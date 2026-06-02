import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";
import type { CancellationReason } from "@modules/booking/types";

async function getBookingService() {
  const { bookingService } = await import("@modules/booking/container");
  return bookingService;
}
async function getValidators() {
  return import("@modules/booking/validators");
}

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/bookings/:id/cancel
export const POST = withPermission("booking", "cancel", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateCancelBooking(body);
    const svc = await getBookingService();
    const cancelled = await svc.cancelBooking(
      id,
      dto.reason as CancellationReason,
      dto.note,
      user.id,
      user.organizationId ?? ""
    );
    return successResponse(cancelled);
  } catch (error) {
    return handleRouteError(error);
  }
});
