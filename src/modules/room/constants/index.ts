// FILE: src/modules/room/constants/index.ts
import type { BedType, RoomOperationalStatus, HousekeepingStatus, MaintenanceStatus, OccupancyStatus } from "../types";

// ─── Error messages ───────────────────────────────────────────────────────────

export const ROOM_ERRORS = {
  NOT_FOUND: "Room not found",
  NUMBER_TAKEN: "A room with this room number already exists in this hotel",
  HOTEL_NOT_FOUND: "Hotel not found or does not belong to this organization",
  ROOM_TYPE_NOT_FOUND: "Room type not found or does not belong to this hotel",
  ROOM_TYPE_MISMATCH: "Room type does not belong to the specified hotel",
  FORBIDDEN: "You do not have access to this room",
  CANNOT_DELETE_WITH_ROOMS: "Cannot delete room: room does not exist",
} as const;

export const ROOM_TYPE_ERRORS = {
  NOT_FOUND: "Room type not found",
  SLUG_TAKEN: "A room type with this slug already exists in this hotel",
  HOTEL_NOT_FOUND: "Hotel not found or does not belong to this organization",
  FORBIDDEN: "You do not have access to this room type",
  HAS_ROOMS: "Cannot delete room type: physical rooms still belong to this type",
} as const;

// ─── Enum value arrays ────────────────────────────────────────────────────────

export const BED_TYPES: BedType[] = [
  "KING",
  "QUEEN",
  "DOUBLE",
  "TWIN",
  "SINGLE",
  "BUNK",
  "SOFA_BED",
  "CALIFORNIA_KING",
];

export const ROOM_OPERATIONAL_STATUSES: RoomOperationalStatus[] = [
  "AVAILABLE",
  "OUT_OF_ORDER",
  "UNDER_MAINTENANCE",
  "BLOCKED",
];

export const HOUSEKEEPING_STATUSES: HousekeepingStatus[] = [
  "CLEAN",
  "DIRTY",
  "INSPECTED",
  "IN_PROGRESS",
  "OUT_OF_SERVICE",
];

export const MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  "NONE",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
];

export const OCCUPANCY_STATUSES: OccupancyStatus[] = [
  "VACANT",
  "OCCUPIED",
  "DUE_IN",
  "DUE_OUT",
];

// ─── Numeric limits ───────────────────────────────────────────────────────────

export const MAX_FLOOR = 200;
export const MIN_BASE_PRICE = 0.01;
export const MAX_BASE_PRICE = 100000;
export const MAX_ROOM_NUMBER_LENGTH = 20;
