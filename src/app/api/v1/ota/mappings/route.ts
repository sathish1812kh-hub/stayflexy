import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/ota/mappings?hotelId=&providerId=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/ota/validators");
    const filter = v.validateOTAMappingFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { otaMappingService } = await import("@modules/ota/container");
    const result = await otaMappingService.listMappings(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/ota/mappings
export const POST = withPermission("ota", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/ota/validators");
    const dto = v.validateCreateOTAMapping(body);
    const { otaMappingService } = await import("@modules/ota/container");
    const mapping = await otaMappingService.createMapping(dto, user.organizationId ?? "");
    return successResponse(mapping, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
