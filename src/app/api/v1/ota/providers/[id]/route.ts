import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/ota/providers/:id
export const GET = withAuth(async (req: NextRequest, { user: _user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const { otaProviderService } = await import("@modules/ota/container");
    const provider = await otaProviderService.getProvider(id);
    return successResponse(provider);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/ota/providers/:id
export const PATCH = withPermission("ota", "update", async (req: NextRequest, { user: _user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await import("@modules/ota/validators");
    const dto = v.validateUpdateOTAProvider(body);
    const { otaProviderService } = await import("@modules/ota/container");
    const provider = await otaProviderService.updateProvider(id, dto);
    return successResponse(provider);
  } catch (error) {
    return handleRouteError(error);
  }
});

// DELETE /api/v1/ota/providers/:id
export const DELETE = withPermission("ota", "delete", async (req: NextRequest, { user: _user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const { otaProviderService } = await import("@modules/ota/container");
    await otaProviderService.deleteProvider(id);
    return successResponse({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
});
