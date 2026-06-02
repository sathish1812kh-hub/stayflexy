// FILE: src/modules/room/container.ts
/**
 * Lightweight service container for the room module.
 * Composes and exposes singleton instances of all room services and repositories.
 */
import { PrismaRoomTypeRepository } from "./repositories/PrismaRoomTypeRepository";
import { PrismaRoomRepository } from "./repositories/PrismaRoomRepository";
import { RoomTypeService } from "./services/RoomTypeService";
import { RoomService } from "./services/RoomService";

const roomTypeRepo = new PrismaRoomTypeRepository();
const roomRepo = new PrismaRoomRepository();

export const roomTypeService = new RoomTypeService(roomTypeRepo);
export const roomService = new RoomService(roomRepo, roomTypeRepo);

export { roomTypeRepo, roomRepo };
