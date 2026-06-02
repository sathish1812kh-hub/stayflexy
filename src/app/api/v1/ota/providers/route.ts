import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/ota/providers?status=&page=&limit=
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const v = await import("@modules/ota/validators");
    const filter = v.validateOTAProviderFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { otaProviderService } = await import("@modules/ota/container");
    const result = await otaProviderService.listProviders(filter);
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/ota/providers
export const POST = withPermission("ota", "create", async (req: NextRequest) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/ota/validators");
    const dto = v.validateCreateOTAProvider(body);
    const { otaProviderService } = await import("@modules/ota/container");
    const provider = await otaProviderService.createProvider(dto);
    return successResponse(provider, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
