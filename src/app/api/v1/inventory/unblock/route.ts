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

// POST /api/v1/inventory/unblock
export const POST = withPermission("inventory", "block", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateUnblockInventory(body);
    const svc = await getInventoryService();
    const result = await svc.unblockInventory(dto, user.organizationId ?? "");
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
