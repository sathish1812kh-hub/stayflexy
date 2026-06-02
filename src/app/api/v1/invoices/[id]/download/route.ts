import { type NextRequest } from "next/server";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth } from "@modules/auth/middleware";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/invoices/:id/download
// Returns structured invoice data for client-side PDF rendering
export const GET = withAuth(async (req: NextRequest, { user }, routeParams: Params | undefined) => {
  try {
    const { id } = await (routeParams?.params ?? Promise.resolve({ id: "" }));
    const svc = (await import("@modules/invoice/container")).invoiceService;
    const invoice = await svc.generateInvoicePdf(id, user.organizationId ?? "");
    return successResponse(invoice);
  } catch (error) {
    return handleRouteError(error);
  }
});
