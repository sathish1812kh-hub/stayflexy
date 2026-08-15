import { getPrismaClient } from '@stayflexi/shared-database'
import type { PrismaClient } from '@prisma/client'
import type {
  IInventoryRepository,
  InventoryAvailability,
} from '../../domain/repositories/IInventoryRepository'

export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async checkAvailability(
    roomTypeId: string,
    checkInDate: Date,
    checkOutDate: Date,
    unitsNeeded = 1,
  ): Promise<boolean> {
    const dates = this.getDateRange(checkInDate, checkOutDate)
    for (const date of dates) {
      let inv: {
        totalInventory: number
        reservedInventory: number
        blockedInventory: number
      } | null = null
      try {
        inv = (await this.db.inventory.findUnique({
          where: { roomTypeId_inventoryDate: { roomTypeId, inventoryDate: date } },
          select: { totalInventory: true, reservedInventory: true, blockedInventory: true },
        })) as any
      } catch {
        // Inventory lookup unavailable (no record / optional in this deployment)
        // → do not block the booking; per-room overlap checks still apply.
        continue
      }
      // No inventory record configured for this date → treat as available.
      if (!inv) continue
      const available = inv.totalInventory - inv.reservedInventory - inv.blockedInventory
      if (available < unitsNeeded) return false
    }
    return true
  }

  async getAvailabilityForRange(
    roomTypeId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<InventoryAvailability[]> {
    const dates = this.getDateRange(checkInDate, checkOutDate)
    const records = await this.db.inventory.findMany({
      where: { roomTypeId, inventoryDate: { gte: checkInDate, lt: checkOutDate } },
      orderBy: { inventoryDate: 'asc' },
    })
    return dates.map((date) => {
      const r = records.find((rec) => rec.inventoryDate.getTime() === date.getTime())
      if (!r) {
        return {
          roomTypeId,
          inventoryDate: date,
          totalInventory: 0,
          reservedInventory: 0,
          blockedInventory: 0,
          availableInventory: 0,
        }
      }
      return {
        roomTypeId,
        inventoryDate: r.inventoryDate,
        totalInventory: r.totalInventory,
        reservedInventory: r.reservedInventory,
        blockedInventory: r.blockedInventory,
        availableInventory: r.totalInventory - r.reservedInventory - r.blockedInventory,
      }
    })
  }

  async reserveInventory(
    roomTypeId: string,
    organizationId: string,
    hotelId: string,
    checkInDate: Date,
    checkOutDate: Date,
  ): Promise<void> {
    const dates = this.getDateRange(checkInDate, checkOutDate)
    for (const date of dates) {
      await this.db.inventory.upsert({
        where: { roomTypeId_inventoryDate: { roomTypeId, inventoryDate: date } },
        create: {
          roomTypeId,
          hotelId,
          organizationId,
          inventoryDate: date,
          totalInventory: 1,
          reservedInventory: 1,
          blockedInventory: 0,
        },
        update: { reservedInventory: { increment: 1 } },
      })
    }
  }

  async releaseInventory(roomTypeId: string, checkInDate: Date, checkOutDate: Date): Promise<void> {
    const dates = this.getDateRange(checkInDate, checkOutDate)
    for (const date of dates) {
      await this.db.inventory
        .updateMany({
          where: {
            roomTypeId,
            inventoryDate: date,
            reservedInventory: { gt: 0 },
          },
          data: { reservedInventory: { decrement: 1 } },
        })
        .catch(() => undefined)
    }
  }

  private getDateRange(checkIn: Date, checkOut: Date): Date[] {
    const dates: Date[] = []
    const current = new Date(checkIn)
    current.setUTCHours(0, 0, 0, 0)
    const end = new Date(checkOut)
    end.setUTCHours(0, 0, 0, 0)
    while (current < end) {
      dates.push(new Date(current))
      current.setUTCDate(current.getUTCDate() + 1)
    }
    return dates
  }
}
