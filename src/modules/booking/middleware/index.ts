// FILE: src/modules/booking/middleware/index.ts
import { type NextRequest } from "next/server";
import { type NextResponse } from "next/server";
import { prisma } from "@lib/prisma";
import { errorResponse } from "@utils/apiResponse";
import { withAuth, type AuthContext, type AuthHandler } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

/**
 * withBookingAccess: validates the booking :id param belongs to the user's org.
 * Passes through to the inner handler if access is granted.
 */
export function withBookingAccess(
  handler: (req: NextRequest, ctx: AuthContext, routeParams: Params | undefined) => Promise<NextResponse> | NextResponse
): (req: NextRequest, routeParams?: Params) => Promise<NextResponse> {
  return withAuth<Params>(async (req, ctx, routeParams) => {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));

    if (!id) {
      return errorResponse("BAD_REQUEST", "Booking ID is required", 400);
    }

    const booking = await prisma.booking.findFirst({
      where: { id, deletedAt: null },
      select: { organizationId: true },
    });

    if (!booking) {
      return errorResponse("NOT_FOUND", "Booking not found", 404);
    }

    if (
      ctx.user.role !== "SUPER_ADMIN" &&
      booking.organizationId !== ctx.user.organizationId
    ) {
      return errorResponse("FORBIDDEN", "You do not have access to this booking", 403);
    }

    return handler(req, ctx, routeParams);
  });
}

/**
 * withBookingHotelAccess: validates the x-hotel-id header belongs to the user's org.
 */
export function withBookingHotelAccess(
  handler: AuthHandler
): (req: NextRequest, routeParams?: Record<string, never>) => Promise<NextResponse> {
  return withAuth(async (req, ctx) => {
    const hotelId = req.headers.get("x-hotel-id");

    if (!hotelId) {
      return errorResponse("BAD_REQUEST", "x-hotel-id header is required", 400);
    }

    if (ctx.user.role !== "SUPER_ADMIN") {
      const hotel = await prisma.hotel.findFirst({
        where: {
          id: hotelId,
          organizationId: ctx.user.organizationId ?? "",
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!hotel) {
        return errorResponse(
          "FORBIDDEN",
          "You do not have access to this hotel",
          403
        );
      }
    }

    return handler(req, ctx);
  });
}
