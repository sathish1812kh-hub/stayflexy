import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

async function getBookingService() {
  const { bookingService } = await import("@modules/booking/container");
  return bookingService;
}
async function getValidators() {
  return import("@modules/booking/validators");
}

// GET /api/v1/bookings?hotelId=X&status=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await getValidators();
    const params = v.validateBookingFilter(Object.fromEntries(req.nextUrl.searchParams));
    const svc = await getBookingService();
    const result = await svc.listBookings(user.organizationId ?? "", params);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/bookings
export const POST = withPermission("booking", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateCreateBooking(body);
    const svc = await getBookingService();
    // Parse ISO date strings to Date objects for type safety
    const parseDate = (s: string) => new Date(s + "T00:00:00.000Z");
    const booking = await svc.createBooking(
      {
        hotelId: dto.hotelId,
        source: dto.source,
        currency: dto.currency,
        specialRequests: dto.specialRequests,
        internalNotes: dto.internalNotes,
        organizationId: user.organizationId ?? "",
        bookedById: user.id,
        rooms: dto.rooms.map((r) => ({
          roomId: r.roomId,
          roomTypeId: r.roomTypeId,
          checkInDate: parseDate(r.checkInDate),
          checkOutDate: parseDate(r.checkOutDate),
          adultCount: r.adultCount,
          childCount: r.childCount,
          specialRequests: r.specialRequests,
        })),
        guests: dto.guests.map((g) => ({
          isPrimary: g.isPrimary,
          firstName: g.firstName,
          lastName: g.lastName,
          email: g.email,
          phone: g.phone,
          nationality: g.nationality,
          governmentIdType: g.governmentIdType,
          governmentIdNumber: g.governmentIdNumber,
          dateOfBirth: g.dateOfBirth ? parseDate(g.dateOfBirth) : undefined,
        })),
      },
      user.id
    );
    return successResponse(booking, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
