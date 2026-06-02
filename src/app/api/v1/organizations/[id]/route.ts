import { type NextRequest } from "next/server";
import { successResponse, noContentResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";
import { errorResponse } from "@utils/apiResponse";

async function getOrgService() {
  const { organizationService } = await import("@modules/organization/container");
  return organizationService;
}
async function getValidators() {
  return import("@modules/organization/validators");
}

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/organizations/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    if (user.role !== "SUPER_ADMIN" && user.organizationId !== id) {
      return errorResponse("FORBIDDEN", "Access to this organization is not permitted", 403);
    }
    const svc = await getOrgService();
    const org = await svc.findById(id);
    if (!org) return errorResponse("NOT_FOUND", "Organization not found", 404);
    return successResponse(org);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/organizations/:id
export const PATCH = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    if (user.role !== "SUPER_ADMIN" && user.organizationId !== id) {
      return errorResponse("FORBIDDEN", "Access to this organization is not permitted", 403);
    }
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateUpdateOrganization(body);
    const svc = await getOrgService();
    const updated = await svc.updateOrganization(id, dto, user.id, { userId: user.id, organizationId: id, ipAddress: req.headers.get("x-forwarded-for") ?? "0.0.0.0", userAgent: req.headers.get("user-agent") ?? "" });
    return successResponse(updated);
  } catch (error) {
    return handleRouteError(error);
  }
});

// DELETE /api/v1/organizations/:id — SUPER_ADMIN or org owner
export const DELETE = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    if (user.role !== "SUPER_ADMIN" && user.organizationId !== id) {
      return errorResponse("FORBIDDEN", "Access to this organization is not permitted", 403);
    }
    const svc = await getOrgService();
    await svc.deactivateOrganization(id, user.id, { userId: user.id, organizationId: id, ipAddress: req.headers.get("x-forwarded-for") ?? "0.0.0.0", userAgent: req.headers.get("user-agent") ?? "" });
    return noContentResponse();
  } catch (error) {
    return handleRouteError(error);
  }
});
