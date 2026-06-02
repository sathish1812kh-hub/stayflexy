import { type NextRequest } from "next/server";
import { PaymentController } from "../controllers";
import type { PaymentService } from "../services";

export function createPaymentRoutes(paymentService: PaymentService) {
  const controller = new PaymentController(paymentService);

  return {
    "POST /payments": (req: NextRequest) => controller.create(req),
    "GET /payments/:id": (req: NextRequest, ctx: { params: { id: string } }) =>
      controller.getById(req, ctx),
    "GET /payments": (req: NextRequest) => controller.listByHotel(req),
    "POST /payments/refund": (req: NextRequest) => controller.refund(req),
  };
}
