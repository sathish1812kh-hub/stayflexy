import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";

export interface BookingSummary {
  id: string;
  confirmationCode: string;
  roomId: string;
  hotelId: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  status: string;
  totalAmount: number;
}

export interface IBookingService {
  findById(id: string): Promise<Nullable<BookingSummary>>;
  findByRoom(roomId: string, params: PaginationParams): Promise<PaginatedResult<BookingSummary>>;
  findByHotel(hotelId: string, params: PaginationParams): Promise<PaginatedResult<BookingSummary>>;
  getActiveBookingForRoom(roomId: string, date: Date): Promise<Nullable<BookingSummary>>;
  getTotalRevenue(hotelId: string, from: Date, to: Date): Promise<number>;
  isRoomBooked(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean>;
}
