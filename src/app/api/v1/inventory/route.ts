import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

async function getInventoryService() {
  const { inventoryService } = await import("@modules/inventory/container");
  return inventoryService;
}
async function getValidators() {
  return import("@modules/inventory/validators");
}

// GET /api/v1/inventory?hotelId=X&roomTypeId=Y&startDate=Z&endDate=W
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await getValidators();
    const params = v.validateInventoryQuery(Object.fromEntries(req.nextUrl.searchParams));
    const svc = await getInventoryService();
    const startDate = v.parseInventoryDate(params.startDate);
    const endDate = v.parseInventoryDate(params.endDate);
    const result = await svc.getInventoryForHotel(params.hotelId, startDate, endDate, user.organizationId ?? "");
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/inventory — set/update inventory
export const POST = withPermission("inventory", "update", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await getValidators();
    const bodyObj = body as Record<string, unknown>;

    const svc = await getInventoryService();

    if ("startDate" in bodyObj && "endDate" in bodyObj) {
      const dto = v.validateBulkSetInventory(body);
      const result = await svc.bulkSetInventory(dto, user.organizationId ?? "");
      return successResponse(result);
    }

    const dto = v.validateSetInventory(body);
    const result = await svc.setInventory(dto, user.organizationId ?? "");
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
