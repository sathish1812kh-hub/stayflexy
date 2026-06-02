import { type NextRequest } from "next/server";
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import {
  validateCreatePayment,
  validateInitiateRefund,
  validatePaymentFilter,
} from "../validators";
import type { PaymentService } from "../services";

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  async create(req: NextRequest) {
    try {
      const body = await req.json() as unknown;
      const dto = validateCreatePayment(body);
      const userId = req.headers.get("x-user-id") ?? "";
      const orgId = req.headers.get("x-organization-id") ?? "";
      const payment = await this.paymentService.createPayment(dto, userId, orgId);
      return createdResponse(payment);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async getById(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const orgId = req.headers.get("x-organization-id") ?? "";
      const payment = await this.paymentService.getPayment(params.id, orgId);
      return successResponse(payment);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async listByHotel(req: NextRequest) {
    try {
      const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
      const orgId = req.headers.get("x-organization-id") ?? "";
      const filter = validatePaymentFilter(searchParams);
      const result = await this.paymentService.listPayments(filter, orgId);
      return paginatedResponse(result.data, result.meta);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async refund(req: NextRequest) {
    try {
      const body = await req.json() as unknown;
      const dto = validateInitiateRefund(body);
      const userId = req.headers.get("x-user-id") ?? "";
      const orgId = req.headers.get("x-organization-id") ?? "";
      const refund = await this.paymentService.initiateRefund(dto, userId, orgId);
      return createdResponse(refund);
    } catch (error) {
      return handleRouteError(error);
    }
  }
}
