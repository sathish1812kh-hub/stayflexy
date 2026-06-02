// FILE: src/modules/hotel/middleware/index.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@lib/prisma";
import { errorResponse } from "@utils/apiResponse";
import { withAuth, type AuthContext, type AuthHandler } from "@modules/auth/middleware";

export interface HotelContext extends AuthContext {
  hotelId: string;
  organizationId: string;
}

export type HotelHandler<TParams = Record<string, never>> = (
  req: NextRequest,
  ctx: HotelContext,
  params?: TParams
) => Promise<NextResponse> | NextResponse;

/**
 * Validates that a hotel identified by :id URL param belongs to the
 * authenticated user's organization. SUPER_ADMIN bypasses org check.
 */
export function withHotelParam<TParams extends { params: Promise<{ id: string }> }>(
  handler: HotelHandler<TParams>
): (req: NextRequest, params?: TParams) => Promise<NextResponse> {
  return withAuth<TParams>(async (req, { user }, params) => {
    const id = params ? (await params.params).id : "";
    if (!id) return errorResponse("BAD_REQUEST", "Hotel ID required", 400);

    const hotel = await prisma.hotel.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!hotel) return errorResponse("NOT_FOUND", "Hotel not found", 404);

    if (user.role !== "SUPER_ADMIN" && hotel.organizationId !== user.organizationId) {
      return errorResponse("FORBIDDEN", "Access to this hotel is not permitted", 403);
    }

    return handler(
      req,
      { user, hotelId: hotel.id, organizationId: hotel.organizationId },
      params
    );
  });
}

/**
 * Validates x-organization-id header matches user's org and injects it.
 */
export function withOrgHotelAccess(handler: AuthHandler): (req: NextRequest) => Promise<NextResponse> {
  return withAuth(async (req, { user }) => {
    const orgId = req.headers.get("x-organization-id") ?? user.organizationId ?? "";

    if (user.role !== "SUPER_ADMIN" && user.organizationId !== orgId) {
      return errorResponse("FORBIDDEN", "Access to this organization is not permitted", 403);
    }

    if (!orgId) return errorResponse("BAD_REQUEST", "Organization context required", 400);

    return handler(req, { user });
  });
}

export { withAuth, type AuthContext, type AuthHandler } from "@modules/auth/middleware";

// Unused import kept for type inference; suppress unused warning
void NextResponse;
