import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";

export interface RoomSummary {
  id: string;
  hotelId: string;
  number: string;
  type: string;
  status: string;
  floor: number;
  maxOccupancy: number;
  baseRate: number;
}

export interface IRoomService {
  findById(id: string): Promise<Nullable<RoomSummary>>;
  findByHotel(hotelId: string, params: PaginationParams): Promise<PaginatedResult<RoomSummary>>;
  isAvailable(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean>;
  getBaseRate(roomId: string): Promise<number>;
  validateRoomBelongsToHotel(roomId: string, hotelId: string): Promise<boolean>;
}
