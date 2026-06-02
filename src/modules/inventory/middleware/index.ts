// FILE: src/modules/inventory/middleware/index.ts
import { type NextRequest, type NextResponse } from "next/server";
import { prisma } from "@lib/prisma";
import { errorResponse } from "@utils/apiResponse";
import { withAuth, type AuthContext, type AuthHandler } from "@modules/auth/middleware";

/**
 * withInventoryHotelAccess
 *
 * Validates that the x-hotel-id request header is present and that the hotel
 * belongs to the authenticated user's organization.
 *
 * Returns:
 *   400 – if the x-hotel-id header is missing
 *   403 – if the hotel doesn't exist or belongs to a different organization
 *
 * Usage:
 *   export const GET = withInventoryHotelAccess(async (req, ctx) => {
 *     const hotelId = req.headers.get("x-hotel-id")!;
 *     // ...
 *   });
 */
export function withInventoryHotelAccess<TParams = Record<string, never>>(
  handler: AuthHandler<TParams>
): (req: NextRequest, params?: TParams) => Promise<NextResponse> {
  return withAuth<TParams>(async (req, ctx: AuthContext, params) => {
    const hotelId = req.headers.get("x-hotel-id");

    if (!hotelId) {
      return errorResponse("BAD_REQUEST", "Missing required header: x-hotel-id", 400);
    }

    // SUPER_ADMIN bypasses org ownership check
    if (ctx.user.role !== "SUPER_ADMIN") {
      if (!ctx.user.organizationId) {
        return errorResponse("FORBIDDEN", "User has no associated organization", 403);
      }

      const hotel = await prisma.hotel.findFirst({
        where: { id: hotelId, organizationId: ctx.user.organizationId, deletedAt: null },
        select: { id: true },
      });

      if (!hotel) {
        return errorResponse(
          "FORBIDDEN",
          "Hotel not found or does not belong to your organization",
          403
        );
      }
    }

    return handler(req, ctx, params);
  });
}
