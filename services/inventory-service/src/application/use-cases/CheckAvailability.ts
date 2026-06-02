import { BadRequestError } from '@stayflexi/shared-errors'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { CheckAvailabilityDto } from '../dtos/inventory.dto'

export interface DateAvailability {
  date: string
  totalRooms: number
  reservedCount: number
  blockedCount: number
  availableCount: number
}

export interface AvailabilityResult {
  roomTypeId: string | undefined
  hotelId: string
  checkInDate: string
  checkOutDate: string
  nights: number
  quantity: number
  isAvailable: boolean
  minAvailableCount: number
  dates: DateAvailability[]
}

function parseUTCDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function generateNightDates(checkIn: Date, checkOut: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(checkIn)
  while (current < checkOut) {
    dates.push(new Date(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

export class CheckAvailability {
  constructor(private readonly inventoryRepo: IInventoryRepository) {}

  async execute(dto: CheckAvailabilityDto): Promise<AvailabilityResult> {
    const checkIn = parseUTCDate(dto.checkInDate)
    const checkOut = parseUTCDate(dto.checkOutDate)

    if (checkOut <= checkIn) {
      throw new BadRequestError('checkOutDate must be after checkInDate')
    }

    const nights = generateNightDates(checkIn, checkOut)

    if (nights.length === 0) {
      throw new BadRequestError('Invalid date range')
    }

    let dateAvailabilities: DateAvailability[]

    if (dto.roomTypeId) {
      const records = await this.inventoryRepo.findByRoomTypeAndDateRange(
        dto.roomTypeId,
        checkIn,
        // endDate is the last night (checkOut - 1 day)
        new Date(checkOut.getTime() - 86_400_000)
      )

      // Map inventory records; dates with no record are fully available if no inventory set
      const byDate = new Map(
        records.map((r) => [formatDate(r.inventoryDate), r])
      )

      dateAvailabilities = nights.map((date) => {
        const dateStr = formatDate(date)
        const inv = byDate.get(dateStr)
        if (!inv) {
          return { date: dateStr, totalRooms: 0, reservedCount: 0, blockedCount: 0, availableCount: 0 }
        }
        return {
          date: dateStr,
          totalRooms: inv.totalRooms,
          reservedCount: inv.reservedCount,
          blockedCount: inv.blockedCount,
          availableCount: inv.availableCount,
        }
      })
    } else {
      // No specific roomTypeId — check for the hotel across all room types
      const records = await this.inventoryRepo.findByHotelAndDateRange(
        dto.hotelId,
        checkIn,
        new Date(checkOut.getTime() - 86_400_000)
      )

      const byDate = new Map<string, { available: number; total: number; reserved: number; blocked: number }>()

      for (const r of records) {
        const dateStr = formatDate(r.inventoryDate)
        const existing = byDate.get(dateStr) ?? { available: 0, total: 0, reserved: 0, blocked: 0 }
        byDate.set(dateStr, {
          available: existing.available + r.availableCount,
          total: existing.total + r.totalRooms,
          reserved: existing.reserved + r.reservedCount,
          blocked: existing.blocked + r.blockedCount,
        })
      }

      dateAvailabilities = nights.map((date) => {
        const dateStr = formatDate(date)
        const agg = byDate.get(dateStr) ?? { available: 0, total: 0, reserved: 0, blocked: 0 }
        return {
          date: dateStr,
          totalRooms: agg.total,
          reservedCount: agg.reserved,
          blockedCount: agg.blocked,
          availableCount: agg.available,
        }
      })
    }

    const minAvailableCount =
      dateAvailabilities.length > 0
        ? Math.min(...dateAvailabilities.map((d) => d.availableCount))
        : 0

    const isAvailable = minAvailableCount >= dto.quantity

    return {
      roomTypeId: dto.roomTypeId,
      hotelId: dto.hotelId,
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      nights: nights.length,
      quantity: dto.quantity,
      isAvailable,
      minAvailableCount,
      dates: dateAvailabilities,
    }
  }
}
