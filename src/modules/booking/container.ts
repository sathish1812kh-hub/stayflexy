// FILE: src/modules/booking/container.ts
import { PrismaBookingRepository } from "./repositories/PrismaBookingRepository";
import { PrismaBookingRoomRepository } from "./repositories/PrismaBookingRoomRepository";
import { PrismaBookingGuestRepository } from "./repositories/PrismaBookingGuestRepository";
import { PrismaBookingAuditRepository } from "./repositories/PrismaBookingAuditRepository";
import { PrismaInventoryRepository } from "@modules/inventory/repositories/PrismaInventoryRepository";
import { PrismaRoomRepository } from "@modules/room/repositories/PrismaRoomRepository";
import { BookingService } from "./services/BookingService";

const bookingRepo = new PrismaBookingRepository();
const bookingRoomRepo = new PrismaBookingRoomRepository();
const bookingGuestRepo = new PrismaBookingGuestRepository();
const bookingAuditRepo = new PrismaBookingAuditRepository();
const inventoryRepo = new PrismaInventoryRepository();
const roomRepo = new PrismaRoomRepository();

export const bookingService = new BookingService(
  bookingRepo,
  bookingRoomRepo,
  bookingGuestRepo,
  bookingAuditRepo,
  inventoryRepo,
  roomRepo
);

export {
  bookingRepo,
  bookingRoomRepo,
  bookingGuestRepo,
  bookingAuditRepo,
  inventoryRepo,
  roomRepo,
};
