import DataLoader from 'dataloader'
import type { PrismaClient } from '@prisma/client'
import { RoomType } from '../../../domain/entities/RoomType'
import { Room, RoomStatus } from '../../../domain/entities/Room'

function mapToRoomType(raw: any): RoomType {
  return new RoomType({
    id: raw.id,
    hotelId: raw.hotelId,
    organizationId: raw.organizationId,
    name: raw.name,
    description: raw.description,
    basePrice: Number(raw.basePrice),
    maxOccupancy: raw.maxOccupancy,
    amenities: raw.amenities as string[] | null,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  })
}

function mapToRoom(raw: any): Room {
  return new Room({
    id: raw.id,
    hotelId: raw.hotelId,
    organizationId: raw.organizationId,
    roomTypeId: raw.roomTypeId,
    roomNumber: raw.roomNumber,
    floor: raw.floor,
    status: raw.status as RoomStatus,
    isActive: raw.isActive,
    notes: raw.notes,
    metadata: raw.metadata as Record<string, unknown> | null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  })
}

export function createRoomTypesByHotelIdLoader(db: PrismaClient) {
  return new DataLoader<string, RoomType[]>(async (hotelIds) => {
    const records = await db.roomType.findMany({
      where: {
        hotelId: { in: [...hotelIds] },
      },
      orderBy: { createdAt: 'asc' },
    })

    const groups = new Map<string, RoomType[]>()
    for (const raw of records) {
      const hotelId = raw.hotelId
      if (!groups.has(hotelId)) {
        groups.set(hotelId, [])
      }
      groups.get(hotelId)!.push(mapToRoomType(raw))
    }

    return hotelIds.map((id) => groups.get(id) || [])
  })
}

export function createRoomsByHotelIdLoader(db: PrismaClient) {
  return new DataLoader<string, Room[]>(async (hotelIds) => {
    const records = await db.room.findMany({
      where: {
        hotelId: { in: [...hotelIds] },
      },
      orderBy: { roomNumber: 'asc' },
    })

    const groups = new Map<string, Room[]>()
    for (const raw of records) {
      const hotelId = raw.hotelId
      if (!groups.has(hotelId)) {
        groups.set(hotelId, [])
      }
      groups.get(hotelId)!.push(mapToRoom(raw))
    }

    return hotelIds.map((id) => groups.get(id) || [])
  })
}

export function createRoomTypeLoader(db: PrismaClient) {
  return new DataLoader<string, RoomType | null>(async (roomTypeIds) => {
    const records = await db.roomType.findMany({
      where: {
        id: { in: [...roomTypeIds] },
      },
    })

    const map = new Map<string, RoomType>()
    for (const raw of records) {
      map.set(raw.id, mapToRoomType(raw))
    }

    return roomTypeIds.map((id) => map.get(id) || null)
  })
}
