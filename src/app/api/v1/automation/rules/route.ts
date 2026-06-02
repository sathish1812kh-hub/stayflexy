import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

// GET /api/v1/automation/rules?hotelId=&triggerType=&ruleStatus=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/automation/validators");
    const filter = v.validateRuleFilter(Object.fromEntries(req.nextUrl.searchParams));
    const { automationRuleService } = await import("@modules/automation/container");
    const result = await automationRuleService.listRules(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/automation/rules
export const POST = withPermission("automation", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await import("@modules/automation/validators");
    const dto = v.validateCreateAutomationRule(body);
    const { automationRuleService } = await import("@modules/automation/container");
    const rule = await automationRuleService.createRule(dto, user.id, user.organizationId ?? "");
    return successResponse(rule, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
