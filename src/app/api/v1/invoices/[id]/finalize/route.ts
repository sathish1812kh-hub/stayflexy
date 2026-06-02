import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withPermission } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/invoices/:id/finalize
export const POST = withPermission("invoice", "update", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = (await import("@modules/invoice/container")).invoiceService;
    const invoice = await svc.finalizeInvoice(id, user.organizationId ?? "");
    return successResponse(invoice);
  } catch (error) {
    return handleRouteError(error);
  }
});
