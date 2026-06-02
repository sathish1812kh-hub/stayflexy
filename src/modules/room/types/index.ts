// FILE: src/modules/room/types/index.ts
import type { Nullable, TimestampFields } from "@shared-types";

// ─── Enum types ───────────────────────────────────────────────────────────────

export type BedType =
  | "KING"
  | "QUEEN"
  | "DOUBLE"
  | "TWIN"
  | "SINGLE"
  | "BUNK"
  | "SOFA_BED"
  | "CALIFORNIA_KING";

export type RoomTypeStatus = "ACTIVE" | "INACTIVE";

export type RoomOperationalStatus =
  | "AVAILABLE"
  | "OUT_OF_ORDER"
  | "UNDER_MAINTENANCE"
  | "BLOCKED";

export type HousekeepingStatus =
  | "CLEAN"
  | "DIRTY"
  | "INSPECTED"
  | "IN_PROGRESS"
  | "OUT_OF_SERVICE";

export type MaintenanceStatus = "NONE" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";

export type OccupancyStatus = "VACANT" | "OCCUPIED" | "DUE_IN" | "DUE_OUT";

// ─── Domain interfaces ────────────────────────────────────────────────────────

export interface RoomType extends TimestampFields {
  id: string;
  hotelId: string;
  organizationId: string;
  name: string;
  slug: string;
  description: Nullable<string>;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  basePrice: number;
  sizeM2: Nullable<number>;
  bedType: BedType;
  amenities: string[];
  status: RoomTypeStatus;
  totalRooms: number;
  deletedAt: Nullable<Date>;
}

export interface Room extends TimestampFields {
  id: string;
  hotelId: string;
  organizationId: string;
  roomTypeId: string;
  roomNumber: string;
  floor: number;
  description: Nullable<string>;
  view: Nullable<string>;
  operationalStatus: RoomOperationalStatus;
  housekeepingStatus: HousekeepingStatus;
  occupancyStatus: OccupancyStatus;
  maintenanceStatus: MaintenanceStatus;
  notes: Nullable<string>;
  lastCleanedAt: Nullable<Date>;
  deletedAt: Nullable<Date>;
}

// ─── Create / Update data shapes ──────────────────────────────────────────────

export interface CreateRoomTypeData {
  hotelId: string;
  organizationId: string;
  name: string;
  slug: string;
  description: Nullable<string>;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  basePrice: number;
  sizeM2: Nullable<number>;
  bedType: BedType;
  amenities: string[];
  status: RoomTypeStatus;
}

export interface UpdateRoomTypeData {
  name?: string;
  slug?: string;
  description?: Nullable<string>;
  maxAdults?: number;
  maxChildren?: number;
  maxOccupancy?: number;
  basePrice?: number;
  sizeM2?: Nullable<number>;
  bedType?: BedType;
  amenities?: string[];
  status?: RoomTypeStatus;
}

export interface CreateRoomData {
  hotelId: string;
  organizationId: string;
  roomTypeId: string;
  roomNumber: string;
  floor: number;
  description: Nullable<string>;
  view: Nullable<string>;
  notes: Nullable<string>;
}

export interface UpdateRoomData {
  roomNumber?: string;
  floor?: number;
  description?: Nullable<string>;
  view?: Nullable<string>;
  notes?: Nullable<string>;
  operationalStatus?: RoomOperationalStatus;
  housekeepingStatus?: HousekeepingStatus;
  occupancyStatus?: OccupancyStatus;
  maintenanceStatus?: MaintenanceStatus;
}
