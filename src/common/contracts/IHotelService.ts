import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";

export interface HotelSummary {
  id: string;
  hotelId: string;
  name: string;
  organizationId: string;
  status: string;
  city: string;
  country: string;
  starRating: number;
  totalRooms: number;
}

export interface IHotelService {
  findById(id: string): Promise<Nullable<HotelSummary>>;
  findByOrganization(organizationId: string, params: PaginationParams): Promise<PaginatedResult<HotelSummary>>;
  validateOwnership(hotelId: string, organizationId: string): Promise<boolean>;
  getRoomIds(hotelId: string): Promise<string[]>;
  isOperational(hotelId: string): Promise<boolean>;
}
