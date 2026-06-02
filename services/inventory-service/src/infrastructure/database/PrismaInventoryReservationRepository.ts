import type { PrismaClient, Prisma } from '@prisma/client'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { InventoryReservation } from '../../domain/entities/InventoryReservation'
import type { ReservationStatus } from '../../domain/entities/InventoryReservation'
import type { IInventoryReservationRepository } from '../../domain/repositories/IInventoryReservationRepository'

type PrismaReservation = Prisma.InventoryReservationGetPayload<Record<string, never>>

function mapToReservation(raw: PrismaReservation): InventoryReservation {
  return new InventoryReservation({
    id: raw.id,
    inventoryId: raw.inventoryId,
    hotelId: raw.hotelId,
    organizationId: raw.organizationId,
    roomTypeId: raw.roomTypeId,
    bookingRef: raw.bookingRef,
    quantity: raw.quantity,
    status: raw.status as ReservationStatus,
    correlationId: raw.correlationId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    releasedAt: raw.releasedAt,
  })
}

export class PrismaInventoryReservationRepository
  implements IInventoryReservationRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByBookingRef(
    bookingRef: string,
    organizationId: string
  ): Promise<InventoryReservation[]> {
    try {
      const records = await this.db.inventoryReservation.findMany({
        where: { bookingRef, organizationId },
        orderBy: { createdAt: 'asc' },
      })
      return records.map(mapToReservation)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async releaseByBookingRef(bookingRef: string, organizationId: string): Promise<number> {
    try {
      const active = await this.db.inventoryReservation.findMany({
        where: { bookingRef, organizationId, status: 'ACTIVE' },
        select: { id: true, inventoryId: true, quantity: true },
      })

      if (active.length === 0) return 0

      await this.db.$transaction(async (tx) => {
        for (const r of active) {
          await tx.inventory.update({
            where: { id: r.inventoryId },
            data: { reservedCount: { decrement: r.quantity } },
          })
        }

        await tx.inventoryReservation.updateMany({
          where: { bookingRef, organizationId, status: 'ACTIVE' },
          data: { status: 'RELEASED', releasedAt: new Date() },
        })
      })

      return active.length
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async countActiveByBookingRef(bookingRef: string): Promise<number> {
    try {
      return this.db.inventoryReservation.count({
        where: { bookingRef, status: 'ACTIVE' },
      })
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }
}
