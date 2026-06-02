import { type NextRequest } from "next/server";
import { successResponse, paginatedResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { withAuth, withPermission } from "@modules/auth/middleware";

async function getInvoiceService() {
  const { invoiceService } = await import("@modules/invoice/container");
  return invoiceService;
}
async function getValidators() {
  return import("@modules/invoice/validators");
}

// GET /api/v1/invoices?hotelId=X&status=&bookingId=&page=&limit=
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const v = await getValidators();
    const filter = v.validateInvoiceFilter(Object.fromEntries(req.nextUrl.searchParams));
    const svc = await getInvoiceService();
    const result = await svc.listInvoices(filter, user.organizationId ?? "");
    return paginatedResponse(result.data, result.meta);
  } catch (error) {
    return handleRouteError(error);
  }
});

// POST /api/v1/invoices
export const POST = withPermission("invoice", "create", async (req: NextRequest, { user }) => {
  try {
    const body = await req.json() as unknown;
    const v = await getValidators();
    const dto = v.validateCreateInvoice(body);
    const svc = await getInvoiceService();
    const invoice = await svc.createInvoice(dto, user.id, user.organizationId ?? "");
    return successResponse(invoice, 201);
  } catch (error) {
    return handleRouteError(error);
  }
});
