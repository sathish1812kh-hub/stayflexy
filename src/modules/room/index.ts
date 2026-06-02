// FILE: src/modules/room/index.ts

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  BedType,
  RoomTypeStatus,
  RoomOperationalStatus,
  HousekeepingStatus,
  MaintenanceStatus,
  OccupancyStatus,
  RoomType,
  Room,
  CreateRoomTypeData,
  UpdateRoomTypeData,
  CreateRoomData,
  UpdateRoomData,
} from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  ROOM_ERRORS,
  ROOM_TYPE_ERRORS,
  BED_TYPES,
  ROOM_OPERATIONAL_STATUSES,
  HOUSEKEEPING_STATUSES,
  MAINTENANCE_STATUSES,
  OCCUPANCY_STATUSES,
  MAX_FLOOR,
  MIN_BASE_PRICE,
  MAX_BASE_PRICE,
  MAX_ROOM_NUMBER_LENGTH,
} from "./constants";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export {
  CreateRoomTypeDto,
  UpdateRoomTypeDto,
  RoomTypeFilterDto,
  UpdateRoomTypeStatusDto,
  CreateRoomDto,
  UpdateRoomDto,
  UpdateRoomStatusDto,
  UpdateHousekeepingStatusDto,
  RoomFilterDto,
} from "./dto";

export type {
  CreateRoomTypeDtoType,
  UpdateRoomTypeDtoType,
  RoomTypeFilterDtoType,
  UpdateRoomTypeStatusDtoType,
  CreateRoomDtoType,
  UpdateRoomDtoType,
  UpdateRoomStatusDtoType,
  UpdateHousekeepingStatusDtoType,
  RoomFilterDtoType,
} from "./dto";

// ─── Validators ───────────────────────────────────────────────────────────────
export {
  validateCreateRoomType,
  validateUpdateRoomType,
  validateRoomTypeFilter,
  validateUpdateRoomTypeStatus,
  validateCreateRoom,
  validateUpdateRoom,
  validateUpdateRoomStatus,
  validateUpdateHousekeepingStatus,
  validateRoomFilter,
} from "./validators";

// ─── Repositories ─────────────────────────────────────────────────────────────
export { RoomTypeRepository, RoomRepository } from "./repositories";
export type { RoomMultiFilters } from "./repositories";
export { PrismaRoomTypeRepository } from "./repositories/PrismaRoomTypeRepository";
export { PrismaRoomRepository } from "./repositories/PrismaRoomRepository";

// ─── Services ─────────────────────────────────────────────────────────────────
export { RoomTypeService, RoomService } from "./services";

// ─── Controllers ─────────────────────────────────────────────────────────────
export { RoomTypeController, RoomController } from "./controllers";

// ─── Middleware ───────────────────────────────────────────────────────────────
export { withHotelAccess, withRoomParam } from "./middleware";
export type { RoomContext, RoomHandler } from "./middleware";

// ─── Routes ──────────────────────────────────────────────────────────────────
export { createRoomTypeRoutes, createRoomRoutes } from "./routes";

// ─── Container ───────────────────────────────────────────────────────────────
export { roomTypeService, roomService, roomTypeRepo, roomRepo } from "./container";
