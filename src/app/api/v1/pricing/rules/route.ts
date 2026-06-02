import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/pricing/rules?hotelId=&status=&pricingStrategy=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/pricing/validators");
    const filter = v.validatePricingRuleFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { pricingRuleService } = await import("@modules/pricing/container");
    const result = await pricingRuleService.listRules(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/pricing/rules
export const POST = withPermission("pricing", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/pricing/validators");
    const dto = v.validateCreatePricingRule(body);
    const { pricingRuleService } = await import("@modules/pricing/container");
    const rule = await pricingRuleService.createRule(dto, user.id, user.organizationId ?? "");
    return successResponse(rule, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
