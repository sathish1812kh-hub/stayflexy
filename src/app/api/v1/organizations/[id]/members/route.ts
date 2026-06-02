import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";
import { errorResponse } from "@utils/apiResponse";
import { z } from "zod";

async function getOrgService() {
  const { organizationService } = await import("@modules/organization/container");
  return organizationService;
}
async function getValidators() {
  return import("@modules/organization/validators");
}

const memberListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/organizations/:id/members
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    if (user.role !== "SUPER_ADMIN" && user.organizationId !== id) {
      return errorResponse("FORBIDDEN", "Access to this organization is not permitted", 403);
    }
    const { searchParams } = req.nextUrl;
    const query = memberListQuery.parse(Object.fromEntries(searchParams));
    const svc = await getOrgService();
    const result = await svc.getMembers(id, query);
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/organizations/:id/members
export const POST = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    if (user.role !== "SUPER_ADMIN" && user.organizationId !== id) {
      return errorResponse("FORBIDDEN", "Access to this organization is not permitted", 403);
    }
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateInviteMember(body);
    const svc = await getOrgService();
    const auditCtx = { userId: user.id, organizationId: id, ipAddress: req.headers.get("x-forwarded-for") ?? "0.0.0.0", userAgent: req.headers.get("user-agent") ?? "" };
    const member = await svc.addMember(id, dto.userId, dto.role as "ORG_ADMIN" | "HOTEL_MANAGER" | "FRONT_DESK" | "HOUSEKEEPING" | "ACCOUNTANT", user.id, auditCtx);
    return successResponse(member, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
