import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

async function getBookingService() {
  const { bookingService } = await import("@modules/booking/container");
  return bookingService;
}
async function getValidators() {
  return import("@modules/booking/validators");
}

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/bookings/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = await getBookingService();
    const booking = await svc.getBooking(id, user.organizationId ?? "");
    return successResponse(booking);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/bookings/:id
export const PATCH = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateUpdateBooking(body);
    const svc = await getBookingService();
    const updated = await svc.updateBooking(id, dto, user.id, user.organizationId ?? "");
    return successResponse(updated);
  } catch (error) {
    return handleRouteError(error);
  }
});
