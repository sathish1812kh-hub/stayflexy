import SchemaBuilder from '@pothos/core'
import FederationPlugin from '@pothos/plugin-federation'
import type { CreateHotel } from '../../application/use-cases/CreateHotel'
import type { GetHotel } from '../../application/use-cases/GetHotel'
import type { UpdateHotel } from '../../application/use-cases/UpdateHotel'
import type { ListHotels } from '../../application/use-cases/ListHotels'
import type { CreateRoomType } from '../../application/use-cases/CreateRoomType'
import type { GetRoomType } from '../../application/use-cases/GetRoomType'
import type { UpdateRoomType } from '../../application/use-cases/UpdateRoomType'
import type { ListRoomTypes } from '../../application/use-cases/ListRoomTypes'
import type { CreateRoom } from '../../application/use-cases/CreateRoom'
import type { GetRoom } from '../../application/use-cases/GetRoom'
import type { UpdateRoom } from '../../application/use-cases/UpdateRoom'
import type { UpdateRoomStatus } from '../../application/use-cases/UpdateRoomStatus'
import type { ListRooms } from '../../application/use-cases/ListRooms'
import type DataLoader from 'dataloader'
import type { RoomType } from '../../domain/entities/RoomType'
import type { Room } from '../../domain/entities/Room'

export interface GraphQLContext {
  userId: string | null
  organizationId: string | null
  role: string
  correlationId?: string
  
  // Use cases
  createHotel: CreateHotel
  getHotel: GetHotel
  updateHotel: UpdateHotel
  listHotels: ListHotels
  createRoomType: CreateRoomType
  getRoomType: GetRoomType
  updateRoomType: UpdateRoomType
  listRoomTypes: ListRoomTypes
  createRoom: CreateRoom
  getRoom: GetRoom
  updateRoom: UpdateRoom
  updateRoomStatus: UpdateRoomStatus
  listRooms: ListRooms
  
  // DataLoaders
  loaders: {
    roomTypesByHotelId: DataLoader<string, RoomType[]>
    roomsByHotelId: DataLoader<string, Room[]>
    roomType: DataLoader<string, RoomType | null>
  }
}

export const builder = new SchemaBuilder<{
  Context: GraphQLContext
  Scalars: {
    DateTime: { Input: Date; Output: Date }
    Decimal: { Input: number; Output: number }
    JSON: { Input: unknown; Output: unknown }
  }
}>({
  plugins: [FederationPlugin],
})

// Define custom scalar types
builder.scalarType('DateTime', {
  serialize: (value) => (value instanceof Date ? value.toISOString() : String(value)),
  parseValue: (value) => (typeof value === 'string' ? new Date(value) : value as Date),
})

builder.scalarType('Decimal', {
  serialize: (value) => Number(value),
  parseValue: (value) => Number(value),
})

builder.scalarType('JSON', {
  serialize: (value) => value,
  parseValue: (value) => value,
})

// Initialize root types
builder.queryType({})
builder.mutationType({})
