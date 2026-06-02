export interface AvailabilityWindow {
  date: Date;
  roomTypeId: string;
  available: boolean;
  remainingCount: number;
  rate: number;
}

export interface IInventoryService {
  // Used by booking engine (contract stable)
  checkAvailability(roomTypeId: string, checkIn: Date, checkOut: Date): Promise<boolean>;
  getAvailabilityWindow(hotelId: string, checkIn: Date, checkOut: Date): Promise<AvailabilityWindow[]>;
  reserveInventory(roomTypeId: string, checkIn: Date, checkOut: Date, bookingId: string): Promise<void>;
  releaseInventory(roomTypeId: string, checkIn: Date, checkOut: Date, bookingId: string): Promise<void>;
  getEffectiveRate(roomTypeId: string, checkIn: Date, checkOut: Date): Promise<number>;
}
