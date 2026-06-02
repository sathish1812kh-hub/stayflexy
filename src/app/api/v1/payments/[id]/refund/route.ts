import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/payments/:id/refund
export const POST = withPermission("payment", "update", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await import("@modules/payment/validators");
    const dto = v.validateInitiateRefund({ ...(body as object), paymentId: id });
    const svc = (await import("@modules/payment/container")).paymentService;
    const refund = await svc.initiateRefund(dto, user.id, user.organizationId ?? "");
    return successResponse(refund, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
