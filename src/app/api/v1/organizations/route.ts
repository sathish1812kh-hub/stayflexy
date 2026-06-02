import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withRoles } from "@modules/auth/middleware";
import { z } from "zod";

// Lazy import to avoid circular deps at module load time
async function getOrgService() {
  const { organizationService } = await import("@modules/organization/container");
  return organizationService;
}
async function getValidators() {
  return import("@modules/organization/validators");
}

const orgFilterQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  plan: z.string().optional(),
  search: z.string().optional(),
});

// GET /api/v1/organizations — SUPER_ADMIN only for listing all orgs
export const GET = withRoles(["SUPER_ADMIN"], async (req: NextRequest) => {
  try {
    const { searchParams } = req.nextUrl;
    const query = orgFilterQuery.parse(Object.fromEntries(searchParams));
    const svc = await getOrgService();
    const result = await svc.listOrganizations({ page: query.page, limit: query.limit, status: query.status, plan: query.plan, search: query.search });
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/organizations — SUPER_ADMIN creates orgs on behalf of owners
export const POST = withRoles(["SUPER_ADMIN"], async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateCreateOrganization(body);
    const svc = await getOrgService();
    const org = await svc.createOrganization(dto, user.id, { userId: user.id, organizationId: "new", ipAddress: req.headers.get("x-forwarded-for") ?? "0.0.0.0", userAgent: req.headers.get("user-agent") ?? "" });
    return successResponse(org, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
