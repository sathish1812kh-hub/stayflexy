import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

async function getPaymentService() {
  const { paymentService } = await import("@modules/payment/container");
  return paymentService;
}

// GET /api/v1/payments/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = await getPaymentService();
    const payment = await svc.getPayment(id, user.organizationId ?? "");
    return successResponse(payment);
  } catch (error) {
    return handleRouteError(error);
  }
});
