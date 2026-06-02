import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/ota/mappings/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const { otaMappingService } = await import("@modules/ota/container");
    const mapping = await otaMappingService.getMapping(id, user.organizationId ?? "");
    return successResponse(mapping);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/ota/mappings/:id
export const PATCH = withPermission("ota", "update", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await import("@modules/ota/validators");
    const dto = v.validateUpdateOTAMapping(body);
    const { otaMappingService } = await import("@modules/ota/container");
    const mapping = await otaMappingService.updateMapping(id, dto, user.organizationId ?? "");
    return successResponse(mapping);
  } catch (error) {
    return handleRouteError(error);
  }
});

// DELETE /api/v1/ota/mappings/:id
export const DELETE = withPermission("ota", "delete", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const { otaMappingService } = await import("@modules/ota/container");
    await otaMappingService.deleteMapping(id, user.organizationId ?? "");
    return successResponse({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
});
