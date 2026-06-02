// FILE: src/modules/room/repositories/index.ts
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  RoomType,
  Room,
  CreateRoomTypeData,
  UpdateRoomTypeData,
  CreateRoomData,
  UpdateRoomData,
  RoomTypeStatus,
  RoomOperationalStatus,
  HousekeepingStatus,
  OccupancyStatus,
} from "../types";

// ─── RoomType Repository ──────────────────────────────────────────────────────

export abstract class RoomTypeRepository extends BaseRepository<
  RoomType,
  CreateRoomTypeData,
  UpdateRoomTypeData
> {
  abstract override findById(id: string): Promise<Nullable<RoomType>>;
  abstract override findMany(params: PaginationParams): Promise<PaginatedResult<RoomType>>;
  abstract override create(data: CreateRoomTypeData): Promise<RoomType>;
  abstract override update(id: string, data: UpdateRoomTypeData): Promise<RoomType>;
  abstract override hardDelete(id: string): Promise<void>;

  abstract findBySlug(hotelId: string, slug: string): Promise<Nullable<RoomType>>;
  abstract findByHotel(hotelId: string, params: PaginationParams): Promise<PaginatedResult<RoomType>>;
  abstract findByStatus(status: RoomTypeStatus, params: PaginationParams): Promise<PaginatedResult<RoomType>>;
  abstract findByHotelAndStatus(hotelId: string, status: RoomTypeStatus, params: PaginationParams): Promise<PaginatedResult<RoomType>>;
  abstract softDelete(id: string): Promise<void>;
  abstract incrementTotalRooms(id: string, delta: number): Promise<void>;
  abstract countByHotel(hotelId: string): Promise<number>;
}

// ─── Room Repository ──────────────────────────────────────────────────────────

export interface RoomMultiFilters {
  hotelId: string;
  roomTypeId?: string;
  operationalStatus?: RoomOperationalStatus;
  housekeepingStatus?: HousekeepingStatus;
  occupancyStatus?: OccupancyStatus;
  floor?: number;
}

export abstract class RoomRepository extends BaseRepository<
  Room,
  CreateRoomData,
  UpdateRoomData
> {
  abstract override findById(id: string): Promise<Nullable<Room>>;
  abstract override findMany(params: PaginationParams): Promise<PaginatedResult<Room>>;
  abstract override create(data: CreateRoomData): Promise<Room>;
  abstract override update(id: string, data: UpdateRoomData): Promise<Room>;
  abstract override hardDelete(id: string): Promise<void>;

  abstract findByNumber(hotelId: string, roomNumber: string): Promise<Nullable<Room>>;
  abstract findByHotel(hotelId: string, params: PaginationParams): Promise<PaginatedResult<Room>>;
  abstract findByRoomType(roomTypeId: string, params: PaginationParams): Promise<PaginatedResult<Room>>;
  abstract findByStatus(
    hotelId: string,
    status: RoomOperationalStatus,
    params: PaginationParams
  ): Promise<PaginatedResult<Room>>;
  abstract findManyFiltered(
    filters: RoomMultiFilters,
    params: PaginationParams
  ): Promise<PaginatedResult<Room>>;
  abstract softDelete(id: string): Promise<void>;
  abstract updateOperationalStatus(id: string, status: RoomOperationalStatus): Promise<Room>;
  abstract updateHousekeepingStatus(id: string, status: HousekeepingStatus): Promise<Room>;
  abstract updateOccupancyStatus(id: string, status: OccupancyStatus): Promise<Room>;
  abstract countByHotelAndType(hotelId: string, roomTypeId: string): Promise<number>;
  abstract countAvailableByHotelAndType(hotelId: string, roomTypeId: string): Promise<number>;
}
