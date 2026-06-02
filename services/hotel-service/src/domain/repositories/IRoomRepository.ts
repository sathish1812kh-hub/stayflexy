import type { Room, RoomStatus } from '../entities/Room'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateRoomData {
  hotelId: string
  organizationId: string
  roomTypeId: string
  roomNumber: string
  floor?: number
  notes?: string
  wing?: string
  zone?: string
  wifiSSID?: string
  wifiPassword?: string
  arrivalNotes?: string
  lockVendor?: string
  lockDeviceId?: string
  lockSecret?: string
  connectingRoomId?: string
  parentRoomId?: string
}

export interface UpdateRoomData {
  roomTypeId?: string
  floor?: number | null
  notes?: string | null
  isActive?: boolean
}

export interface RoomFilter {
  hotelId: string
  status?: RoomStatus
  roomTypeId?: string
  isActive?: boolean
  page: number
  limit: number
}

export interface IRoomRepository {
  findById(id: string): Promise<Room | null>
  findByHotelAndNumber(hotelId: string, roomNumber: string): Promise<Room | null>
  create(data: CreateRoomData): Promise<Room>
  update(id: string, data: UpdateRoomData): Promise<Room>
  updateStatus(id: string, status: RoomStatus): Promise<Room>
  findMany(filter: RoomFilter): Promise<PaginatedResult<Room>>
  createStatusAudit(data: {
    roomId: string
    fromStatus: RoomStatus
    toStatus: RoomStatus
    changedBy: string
    reason?: string
  }): Promise<void>
}
