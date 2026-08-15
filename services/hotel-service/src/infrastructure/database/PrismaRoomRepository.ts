import type { PrismaClient, Prisma } from '@prisma/client'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginatedResult } from '@stayflexi/shared-types'
import { Room } from '../../domain/entities/Room'
import type { RoomStatus } from '../../domain/entities/Room'
import type {
  IRoomRepository,
  CreateRoomData,
  UpdateRoomData,
  RoomFilter,
} from '../../domain/repositories/IRoomRepository'

type PrismaRoom = Prisma.RoomGetPayload<Record<string, never>>

function mapToRoom(raw: PrismaRoom): Room {
  return new Room({
    id: raw.id,
    hotelId: raw.hotelId,
    organizationId: raw.organizationId,
    roomTypeId: raw.roomTypeId,
    roomNumber: raw.roomNumber,
    floor: raw.floor,
    status: (raw.operationalStatus as any) || 'AVAILABLE',
    isActive: raw.deletedAt === null,
    notes: raw.notes,
    wing: raw.wing,
    zone: raw.zone,
    wifiSSID: raw.wifiSSID,
    wifiPassword: raw.wifiPassword,
    arrivalNotes: raw.arrivalNotes,
    lockVendor: raw.lockVendor,
    lockDeviceId: raw.lockDeviceId,
    lockSecret: raw.lockSecret,
    connectingRoomId: raw.connectingRoomId,
    parentRoomId: raw.parentRoomId,
    metadata: null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  })
}

export class PrismaRoomRepository implements IRoomRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Room | null> {
    try {
      const raw = await this.db.room.findUnique({ where: { id } })
      return raw ? mapToRoom(raw) : null
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findByHotelAndNumber(hotelId: string, roomNumber: string): Promise<Room | null> {
    try {
      const raw = await this.db.room.findUnique({
        where: { hotelId_roomNumber: { hotelId, roomNumber } },
      })
      return raw ? mapToRoom(raw) : null
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async create(data: CreateRoomData): Promise<Room> {
    try {
      const raw = await this.db.room.create({
        data: {
          hotelId: data.hotelId,
          organizationId: data.organizationId,
          roomTypeId: data.roomTypeId,
          roomNumber: data.roomNumber,
          floor: data.floor ?? 1,
          notes: data.notes ?? null,
          wing: data.wing ?? null,
          zone: data.zone ?? null,
          wifiSSID: data.wifiSSID ?? null,
          wifiPassword: data.wifiPassword ?? null,
          arrivalNotes: data.arrivalNotes ?? null,
          lockVendor: data.lockVendor ?? null,
          lockDeviceId: data.lockDeviceId ?? null,
          lockSecret: data.lockSecret ?? null,
          connectingRoomId: data.connectingRoomId ?? null,
          parentRoomId: data.parentRoomId ?? null,
        },
      })
      return mapToRoom(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async update(id: string, data: UpdateRoomData): Promise<Room> {
    try {
      const raw = await this.db.room.update({
        where: { id },
        data: data as Prisma.RoomUpdateInput,
      })
      return mapToRoom(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async updateStatus(id: string, status: RoomStatus): Promise<Room> {
    try {
      const raw = await this.db.room.update({
        where: { id },
        data: { operationalStatus: (status as any) || 'AVAILABLE' },
      })
      return mapToRoom(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findMany(filter: RoomFilter): Promise<PaginatedResult<Room>> {
    const skip = (filter.page - 1) * filter.limit

    const where: Prisma.RoomWhereInput = {
      hotelId: filter.hotelId,
      ...(filter.status !== undefined && { operationalStatus: filter.status as any }),
      ...(filter.roomTypeId !== undefined && { roomTypeId: filter.roomTypeId }),
      ...(filter.isActive !== undefined &&
        (filter.isActive ? { deletedAt: null } : { NOT: { deletedAt: null } })),
    }

    const [records, total] = await Promise.all([
      this.db.room.findMany({
        where,
        skip,
        take: filter.limit,
        orderBy: { roomNumber: 'asc' },
      }),
      this.db.room.count({ where }),
    ])

    return {
      data: records.map(mapToRoom),
      meta: buildPaginationMeta(total, filter.page, filter.limit),
    }
  }

  async createStatusAudit(_data: {
    roomId: string
    fromStatus: RoomStatus
    toStatus: RoomStatus
    changedBy: string
    reason?: string
  }): Promise<void> {
    // Audit handled in operation logs
  }
}
