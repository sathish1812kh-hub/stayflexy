import type { RoomType } from '../entities/RoomType'
import type { PaginatedResult } from '@stayflexi/shared-types'

export interface CreateRoomTypeData {
  hotelId: string
  organizationId: string
  name: string
  description?: string
  basePrice: number
  maxOccupancy: number
  maxAdults?: number
  maxChildren?: number
  maxInfants?: number
  minChildAge?: number
  maxChildAge?: number
  minInfantAge?: number
  maxInfantAge?: number
  minOccupancy?: number
  absoluteMax?: number
  hourlyPrice?: number
  extraBedPrice?: number
  extraGuestPrice?: number
  maxExtraBeds?: number
  amenities?: string[]
}

export interface UpdateRoomTypeData {
  name?: string
  description?: string | null
  basePrice?: number
  maxOccupancy?: number
  amenities?: string[] | null
  isActive?: boolean
}

export interface RoomTypeFilter {
  hotelId: string
  isActive?: boolean
  page: number
  limit: number
}

export interface IRoomTypeRepository {
  findById(id: string): Promise<RoomType | null>
  findByHotelAndName(hotelId: string, name: string): Promise<RoomType | null>
  create(data: CreateRoomTypeData): Promise<RoomType>
  update(id: string, data: UpdateRoomTypeData): Promise<RoomType>
  findMany(filter: RoomTypeFilter): Promise<PaginatedResult<RoomType>>
}
