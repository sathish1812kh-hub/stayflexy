import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/pricing/rules/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const { pricingRuleService } = await import("@modules/pricing/container");
    const rule = await pricingRuleService.getRule(id, user.organizationId ?? "");
    return successResponse(rule);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/pricing/rules/:id
export const PATCH = withPermission("pricing", "update", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await import("@modules/pricing/validators");
    const dto = v.validateUpdatePricingRule(body);
    const { pricingRuleService } = await import("@modules/pricing/container");
    const rule = await pricingRuleService.updateRule(id, dto, user.id, user.organizationId ?? "");
    return successResponse(rule);
  } catch (error) {
    return handleRouteError(error);
  }
});

// DELETE /api/v1/pricing/rules/:id — archives the rule (soft delete)
export const DELETE = withPermission("pricing", "delete", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const { pricingRuleService } = await import("@modules/pricing/container");
    await pricingRuleService.deleteRule(id, user.organizationId ?? "");
    return successResponse({ archived: true });
  } catch (error) {
    return handleRouteError(error);
  }
});
