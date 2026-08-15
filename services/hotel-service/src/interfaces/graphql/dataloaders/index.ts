import DataLoader from 'dataloader'
import type { PrismaClient } from '@prisma/client'
import { RoomType } from '../../../domain/entities/RoomType'
import { Room, RoomStatus } from '../../../domain/entities/Room'

// The live database is owned by the monolith Prisma schema (src/database/prisma),
// which differs from what this service's code was written against: room state is
// stored as four granular columns (operational/occupancy/housekeeping/maintenance)
// with no single `status`, and lifecycle is tracked via `deletedAt` with no
// `isActive`. These mappers bridge that gap so the GraphQL layer (which expects a
// single non-nullable `status` and `isActive`) gets valid values.

const numOr = (v: any, fallback: number): number => (v == null ? fallback : Number(v))

function deriveRoomStatus(raw: any): RoomStatus {
  // If a real single `status` column ever exists, honour it; otherwise collapse
  // the four granular status columns using standard PMS precedence
  // (out-of-order > maintenance > blocked > occupied > housekeeping > available).
  if (typeof raw.status === 'string') return raw.status as RoomStatus
  if (raw.operationalStatus === 'OUT_OF_ORDER') return 'OUT_OF_ORDER'
  if (
    raw.operationalStatus === 'UNDER_MAINTENANCE' ||
    raw.maintenanceStatus === 'SCHEDULED' ||
    raw.maintenanceStatus === 'IN_PROGRESS'
  ) {
    return 'MAINTENANCE'
  }
  if (raw.operationalStatus === 'BLOCKED') return 'BLOCKED'
  if (raw.occupancyStatus === 'OCCUPIED') return 'OCCUPIED'
  if (
    raw.housekeepingStatus === 'DIRTY' ||
    raw.housekeepingStatus === 'IN_PROGRESS' ||
    raw.housekeepingStatus === 'OUT_OF_SERVICE'
  ) {
    return 'HOUSEKEEPING'
  }
  return 'AVAILABLE'
}

function mapToRoomType(raw: any): RoomType {
  const maxOcc = numOr(raw.maxOccupancy, 2)
  return new RoomType({
    id: raw.id,
    hotelId: raw.hotelId,
    organizationId: raw.organizationId,
    name: raw.name,
    description: raw.description ?? null,
    basePrice: numOr(raw.basePrice, 0),
    maxOccupancy: maxOcc,
    maxAdults: numOr(raw.maxAdults, maxOcc),
    maxChildren: numOr(raw.maxChildren, 0),
    maxInfants: numOr(raw.maxInfants, 0),
    minChildAge: numOr(raw.minChildAge, 0),
    maxChildAge: numOr(raw.maxChildAge, 12),
    minInfantAge: numOr(raw.minInfantAge, 0),
    maxInfantAge: numOr(raw.maxInfantAge, 2),
    minOccupancy: numOr(raw.minOccupancy, 1),
    absoluteMax: numOr(raw.absoluteMax, maxOcc),
    hourlyPrice: raw.hourlyPrice != null ? Number(raw.hourlyPrice) : null,
    extraBedPrice: numOr(raw.extraBedPrice, 0),
    extraGuestPrice: numOr(raw.extraGuestPrice, 0),
    maxExtraBeds: numOr(raw.maxExtraBeds, 0),
    amenities: (raw.amenities as string[] | null) ?? null,
    isActive: raw.isActive ?? raw.deletedAt == null,
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
    floor: raw.floor ?? null,
    status: deriveRoomStatus(raw),
    isActive: raw.isActive ?? raw.deletedAt == null,
    notes: raw.notes ?? null,
    wing: raw.wing ?? null,
    zone: raw.zone ?? null,
    wifiSSID: raw.wifiSSID ?? null,
    wifiPassword: raw.wifiPassword ?? null,
    arrivalNotes: raw.arrivalNotes ?? null,
    lockVendor: raw.lockVendor ?? null,
    lockDeviceId: raw.lockDeviceId ?? null,
    lockSecret: raw.lockSecret ?? null,
    connectingRoomId: raw.connectingRoomId ?? null,
    parentRoomId: raw.parentRoomId ?? null,
    metadata: (raw.metadata as Record<string, unknown> | null) ?? null,
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
