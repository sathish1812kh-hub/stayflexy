// FILE: src/modules/booking/routes/index.ts
import { type NextRequest } from "next/server";
import { BookingController } from "../controllers";
import type { BookingService } from "../services";

export function createBookingRoutes(bookingService: BookingService) {
  const controller = new BookingController(bookingService);

  return {
    "POST /bookings": (req: NextRequest, userId: string, orgId: string) =>
      controller.create(req, userId, orgId),
    "GET /bookings": (req: NextRequest, _userId: string, orgId: string) =>
      controller.list(req, orgId),
    "GET /bookings/:id": (_req: NextRequest, userId: string, orgId: string, id: string) =>
      controller.getById(id, orgId),
    "PATCH /bookings/:id": (req: NextRequest, userId: string, orgId: string, id: string) =>
      controller.update(req, id, userId, orgId),
    "POST /bookings/:id/cancel": (req: NextRequest, userId: string, orgId: string, id: string) =>
      controller.cancel(req, id, userId, orgId),
    "POST /bookings/:id/check-in": (_req: NextRequest, userId: string, orgId: string, id: string) =>
      controller.checkIn(id, userId, orgId),
    "POST /bookings/:id/check-out": (_req: NextRequest, userId: string, orgId: string, id: string) =>
      controller.checkOut(id, userId, orgId),
    "POST /bookings/:id/no-show": (_req: NextRequest, userId: string, orgId: string, id: string) =>
      controller.markNoShow(id, userId, orgId),
    "GET /bookings/availability/search": (req: NextRequest, _userId: string, orgId: string) =>
      controller.searchAvailability(req, orgId),
  };
}
