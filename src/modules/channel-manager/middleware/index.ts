// Channel manager middleware — validates OTA mapping ownership and hotel scope.
// Intended to be composed with withAuth from the auth module.
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@lib/prisma";
import { ForbiddenError, NotFoundError } from "@errors/HttpError";
import { handleRouteError } from "@middleware/errorHandler";
import type { AuthContext } from "@modules/auth/middleware";

// Validates that the hotelId query param belongs to the caller's organization
export async function validateHotelScope(
  req: NextRequest,
  context: AuthContext
): Promise<NextResponse | null> {
  const hotelId = req.nextUrl.searchParams.get("hotelId");
  if (!hotelId) return null;

  try {
    const hotel = await prisma.hotel.findFirst({
      where: {
        id: hotelId,
        organizationId: context.user.organizationId ?? "",
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!hotel) throw new ForbiddenError("Hotel not found or access denied");
    return null;
  } catch (error) {
    return handleRouteError(error);
  }
}

// Validates that a given OTA mapping belongs to the caller's organization
export async function validateMappingOwnership(
  mappingId: string,
  orgId: string
): Promise<void> {
  const mapping = await prisma.oTAMapping.findFirst({
    where: { id: mappingId },
    select: { organizationId: true },
  });
  if (!mapping) throw new NotFoundError("OTA mapping not found");
  if (mapping.organizationId !== orgId) throw new ForbiddenError("Access denied to this OTA mapping");
}
