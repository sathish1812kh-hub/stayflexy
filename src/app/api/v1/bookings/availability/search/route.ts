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

// GET /api/v1/bookings/availability/search?hotelId=X&checkInDate=Y&checkOutDate=Z&adultCount=2
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await getValidators();
    const params = v.validateAvailabilitySearch(Object.fromEntries(req.nextUrl.searchParams));
    const svc = await getBookingService();
    const result = await svc.searchAvailability(params, user.organizationId ?? "");
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
