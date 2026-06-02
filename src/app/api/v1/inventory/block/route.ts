import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";

async function getInventoryService() {
  const { inventoryService } = await import("@modules/inventory/container");
  return inventoryService;
}
async function getValidators() {
  return import("@modules/inventory/validators");
}

// POST /api/v1/inventory/block
export const POST = withPermission("inventory", "block", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await getValidators();
    const bodyObj = body as Record<string, unknown>;
    const svc = await getInventoryService();

    if ("startDate" in bodyObj && "endDate" in bodyObj) {
      const dto = v.validateBulkBlockInventory(body);
      const result = await svc.bulkBlockInventory(dto, user.organizationId ?? "", user.id);
      return successResponse(result, 201);
    }

    const dto = v.validateBlockInventory(body);
    const result = await svc.blockInventory(dto, user.organizationId ?? "", user.id);
    return successResponse(result, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
