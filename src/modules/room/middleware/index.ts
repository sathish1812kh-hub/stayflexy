// FILE: src/modules/room/middleware/index.ts
import type { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { prisma } from "@lib/prisma";
import { errorResponse } from "@utils/apiResponse";
import { withAuth, type AuthContext } from "@modules/auth/middleware";

// ─── Extended context ─────────────────────────────────────────────────────────

export interface RoomContext extends AuthContext {
  hotelId: string;
  organizationId: string;
}

export type RoomHandler<TParams = Record<string, never>> = (
  req: NextRequest,
  ctx: RoomContext,
  params?: TParams
) => Promise<NextResponse> | NextResponse;

// ─── withHotelAccess ─────────────────────────────────────────────────────────
// Validates the x-hotel-id header — the hotel must belong to the user's org.

export function withHotelAccess<TParams = Record<string, never>>(
  handler: RoomHandler<TParams>
): (req: NextRequest, params?: TParams) => Promise<NextResponse> {
  return withAuth<TParams>(async (req: NextRequest, ctx: AuthContext, params?: TParams): Promise<NextResponse> => {
    const hotelId = req.headers.get("x-hotel-id");
    if (!hotelId) {
      return errorResponse("BAD_REQUEST", "x-hotel-id header is required", 400);
    }

    if (!ctx.user.organizationId) {
      return errorResponse("FORBIDDEN", "User does not belong to any organization", 403);
    }

    const hotel = await prisma.hotel.findFirst({
      where: { id: hotelId, organizationId: ctx.user.organizationId, deletedAt: null },
      select: { id: true, organizationId: true },
    });

    if (!hotel) {
      return errorResponse(
        "NOT_FOUND",
        "Hotel not found or does not belong to your organization",
        404
      );
    }

    const roomCtx: RoomContext = {
      ...ctx,
      hotelId: hotel.id,
      organizationId: hotel.organizationId,
    };

    return handler(req, roomCtx, params);
  });
}

// ─── withRoomParam ────────────────────────────────────────────────────────────
// Validates that the :id param room exists and belongs to the user's org hotel.

export function withRoomParam<TParams extends { params: Promise<{ id: string }> }>(
  handler: RoomHandler<TParams>
): (req: NextRequest, params?: TParams) => Promise<NextResponse> {
  return withAuth<TParams>(async (req: NextRequest, ctx: AuthContext, routeParams?: TParams): Promise<NextResponse> => {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    if (!id) {
      return errorResponse("BAD_REQUEST", "Room ID is required", 400);
    }

    if (!ctx.user.organizationId) {
      return errorResponse("FORBIDDEN", "User does not belong to any organization", 403);
    }

    const room = await prisma.room.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, hotelId: true, hotel: { select: { organizationId: true } } },
    });

    if (!room) {
      return errorResponse("NOT_FOUND", "Room not found", 404);
    }

    if (room.hotel.organizationId !== ctx.user.organizationId) {
      return errorResponse("NOT_FOUND", "Room not found", 404);
    }

    const roomCtx: RoomContext = {
      ...ctx,
      hotelId: room.hotelId,
      organizationId: room.hotel.organizationId,
    };

    return handler(req, roomCtx, routeParams);
  });
}
