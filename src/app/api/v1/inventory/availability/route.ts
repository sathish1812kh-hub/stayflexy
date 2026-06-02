import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

async function getInventoryService() {
  const { inventoryService } = await import("@modules/inventory/container");
  return inventoryService;
}
async function getValidators() {
  return import("@modules/inventory/validators");
}

// GET /api/v1/inventory/availability?hotelId=X&roomTypeId=Y&startDate=Z&endDate=W&minAvailable=1
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await getValidators();
    const params = v.validateAvailabilityQuery(Object.fromEntries(req.nextUrl.searchParams));
    const svc = await getInventoryService();
    const result = await svc.checkAvailability(params, user.organizationId ?? "");
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
