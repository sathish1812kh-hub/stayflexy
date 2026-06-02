// FILE: src/modules/hotel/container.ts
import { PrismaHotelRepository } from "./repositories/PrismaHotelRepository";
import { HotelService } from "./services/HotelService";

const hotelRepo = new PrismaHotelRepository();
export const hotelService = new HotelService(hotelRepo);
export { hotelRepo };
