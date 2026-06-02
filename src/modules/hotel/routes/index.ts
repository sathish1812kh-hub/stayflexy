// FILE: src/modules/hotel/routes/index.ts
// Next.js App Router route files live in src/app/api/v1/hotels/.
// This file is a compatibility shim for the module's route factory pattern.
import { HotelController } from "../controllers";
import type { HotelService } from "../services/HotelService";

export function createHotelRoutes(hotelService: HotelService): HotelController {
  return new HotelController(hotelService);
}
