import type { PrismaClient, Prisma } from '@prisma/client'
import { fromPrismaError, ConflictError } from '@stayflexi/shared-errors'
import { Inventory } from '../../domain/entities/Inventory'
import type {
  IInventoryRepository,
  FindOrCreateInventoryData,
  ReserveDateRangeData,
} from '../../domain/repositories/IInventoryRepository'

type PrismaInventory = Prisma.InventoryGetPayload<Record<string, never>>

function mapToInventory(raw: PrismaInventory): Inventory {
  return new Inventory({
    id: raw.id,
    hotelId: raw.hotelId,
    organizationId: raw.organizationId,
    roomTypeId: raw.roomTypeId,
    inventoryDate: raw.inventoryDate,
    totalRooms: raw.totalRooms,
    reservedCount: raw.reservedCount,
    blockedCount: raw.blockedCount,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  })
}

export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByRoomTypeAndDate(roomTypeId: string, date: Date): Promise<Inventory | null> {
    try {
      const raw = await this.db.inventory.findUnique({
        where: { roomTypeId_inventoryDate: { roomTypeId, inventoryDate: date } },
      })
      return raw ? mapToInventory(raw) : null
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findOrCreate(data: FindOrCreateInventoryData): Promise<Inventory> {
    try {
      const raw = await this.db.inventory.upsert({
        where: {
          roomTypeId_inventoryDate: {
            roomTypeId: data.roomTypeId,
            inventoryDate: data.date,
          },
        },
        create: {
          hotelId: data.hotelId,
          organizationId: data.organizationId,
          roomTypeId: data.roomTypeId,
          inventoryDate: data.date,
          totalRooms: data.totalRoomsHint,
          reservedCount: 0,
          blockedCount: 0,
        },
        update: {
          // If hint > 0, allow caller to update total (e.g., when hotel adds rooms)
          ...(data.totalRoomsHint > 0 ? { totalRooms: data.totalRoomsHint } : {}),
        },
      })
      return mapToInventory(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findByRoomTypeAndDateRange(
    roomTypeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Inventory[]> {
    try {
      const records = await this.db.inventory.findMany({
        where: {
          roomTypeId,
          inventoryDate: { gte: startDate, lte: endDate },
        },
        orderBy: { inventoryDate: 'asc' },
      })
      return records.map(mapToInventory)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findByHotelAndDateRange(
    hotelId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Inventory[]> {
    try {
      const records = await this.db.inventory.findMany({
        where: {
          hotelId,
          inventoryDate: { gte: startDate, lte: endDate },
        },
        orderBy: [{ inventoryDate: 'asc' }, { roomTypeId: 'asc' }],
      })
      return records.map(mapToInventory)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  /**
   * Atomically reserves inventory for a date range within a single Prisma transaction.
   * Re-checks availability inside the transaction to guard against any concurrent writes
   * that slipped through the distributed lock (defense in depth).
   * Returns the created InventoryReservation IDs.
   */
  async reserveDateRange(data: ReserveDateRangeData): Promise<string[]> {
    const reservationIds = await this.db.$transaction(async (tx) => {
      const ids: string[] = []

      for (const date of data.dates) {
        // Find or create inventory inside the transaction
        const raw = await tx.inventory.upsert({
          where: {
            roomTypeId_inventoryDate: {
              roomTypeId: data.roomTypeId,
              inventoryDate: date,
            },
          },
          create: {
            hotelId: data.hotelId,
            organizationId: data.organizationId,
            roomTypeId: data.roomTypeId,
            inventoryDate: date,
            totalRooms: data.totalRoomsHint,
            reservedCount: 0,
            blockedCount: 0,
          },
          update: {
            ...(data.totalRoomsHint > 0 ? { totalRooms: data.totalRoomsHint } : {}),
          },
        })

        const available = raw.totalRooms - raw.reservedCount - raw.blockedCount
        if (available < data.quantity) {
          throw new ConflictError(
            `Overbooking prevented for ${date.toISOString().slice(0, 10)}: available=${available}, requested=${data.quantity}`,
            'OVERBOOKING_PREVENTED'
          )
        }

        await tx.inventory.update({
          where: { id: raw.id },
          data: { reservedCount: { increment: data.quantity } },
        })

        const reservation = await tx.inventoryReservation.create({
          data: {
            inventoryId: raw.id,
            hotelId: data.hotelId,
            organizationId: data.organizationId,
            roomTypeId: data.roomTypeId,
            bookingRef: data.bookingRef,
            quantity: data.quantity,
            status: 'ACTIVE',
            correlationId: data.correlationId ?? null,
          },
        })

        ids.push(reservation.id)
      }

      return ids
    })

    return reservationIds
  }

  async incrementBlocked(id: string, quantity: number): Promise<Inventory> {
    try {
      const raw = await this.db.inventory.update({
        where: { id },
        data: { blockedCount: { increment: quantity } },
      })
      return mapToInventory(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async decrementBlocked(id: string, quantity: number): Promise<Inventory> {
    try {
      const raw = await this.db.inventory.update({
        where: { id },
        data: { blockedCount: { decrement: quantity } },
      })
      return mapToInventory(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async updateTotalRooms(hotelId: string, roomTypeId: string, totalRooms: number): Promise<void> {
    try {
      await this.db.inventory.updateMany({
        where: { hotelId, roomTypeId },
        data: { totalRooms },
      })
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }
}
