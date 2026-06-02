import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/ota/sync/reservations?hotelId=&providerId=&syncStatus=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/ota/validators");
    const filter = v.validateOTAReservationFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { otaReservationService } = await import("@modules/ota/container");
    const result = await otaReservationService.listReservations(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/ota/sync/reservations — ingest raw OTA reservation payload
export const POST = withPermission("ota", "sync", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/ota/validators");
    const dto = v.validateIngestReservation(body);
    const { otaReservationService } = await import("@modules/ota/container");
    const reservation = await otaReservationService.ingestReservation(dto, user.organizationId ?? "");
    return successResponse(reservation, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
