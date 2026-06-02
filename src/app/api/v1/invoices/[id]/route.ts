import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

async function getInvoiceService() {
  const { invoiceService } = await import("@modules/invoice/container");
  return invoiceService;
}

// GET /api/v1/invoices/:id
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = await getInvoiceService();
    const invoice = await svc.getInvoice(id, user.organizationId ?? "");
    return successResponse(invoice);
  } catch (error) {
    return handleRouteError(error);
  }
});

// PATCH /api/v1/invoices/:id
export const PATCH = withPermission("invoice", "update", async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const body = await req.json() as unknown;
    const v = await import("@modules/invoice/validators");
    const dto = v.validateUpdateInvoice(body);
    const svc = await getInvoiceService();
    const invoice = await svc.updateInvoice(id, dto, user.organizationId ?? "");
    return successResponse(invoice);
  } catch (error) {
    return handleRouteError(error);
  }
});
