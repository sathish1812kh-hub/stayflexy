import type { Inventory } from '../entities/Inventory'

export interface FindOrCreateInventoryData {
  roomTypeId: string
  hotelId: string
  organizationId: string
  date: Date
  totalRoomsHint: number
}

export interface ReserveDateRangeData {
  dates: Date[]
  roomTypeId: string
  hotelId: string
  organizationId: string
  bookingRef: string
  quantity: number
  totalRoomsHint: number
  correlationId?: string
}

export interface ReleaseDateRangeResult {
  releasedCount: number
  inventoryIds: string[]
}

export interface IInventoryRepository {
  findByRoomTypeAndDate(roomTypeId: string, date: Date): Promise<Inventory | null>
  findOrCreate(data: FindOrCreateInventoryData): Promise<Inventory>
  findByRoomTypeAndDateRange(
    roomTypeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Inventory[]>
  findByHotelAndDateRange(
    hotelId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Inventory[]>
  /** Atomically reserve across all dates — throws on overbooking */
  reserveDateRange(data: ReserveDateRangeData): Promise<string[]>
  incrementBlocked(id: string, quantity: number): Promise<Inventory>
  decrementBlocked(id: string, quantity: number): Promise<Inventory>
  updateTotalRooms(hotelId: string, roomTypeId: string, totalRooms: number): Promise<void>
}
