import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

async function getPaymentService() {
  const { paymentService } = await import("@modules/payment/container");
  return paymentService;
}

// GET /api/v1/payments/reconciliation?hotelId=X&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await import("@modules/payment/validators");
    const dto = v.validateReconciliationQuery(Object.fromEntries(req.nextUrl.searchParams));
    const svc = await getPaymentService();
    const result = await svc.getReconciliation(dto, user.organizationId ?? "");
    return successResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
});
