import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

async function getPaymentService() {
  const { paymentService } = await import("@modules/payment/container");
  return paymentService;
}
async function getValidators() {
  return import("@modules/payment/validators");
}

// GET /api/v1/payments?hotelId=X&status=&method=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await getValidators();
    const filter = v.validatePaymentFilter(Object.fromEntries(req.nextUrl.searchParams));
    const svc = await getPaymentService();
    const result = await svc.listPayments(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/payments
export const POST = withPermission("payment", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateCreatePayment(body);
    const svc = await getPaymentService();
    const payment = await svc.createPayment(dto, user.id, user.organizationId ?? "");
    return successResponse(payment, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
