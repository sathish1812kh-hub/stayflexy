import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { GetCalendarDto } from '../dtos/inventory.dto'

export interface CalendarDay {
  date: string
  dayOfWeek: number
  roomTypes: Array<{
    roomTypeId: string
    totalRooms: number
    reservedCount: number
    blockedCount: number
    availableCount: number
  }>
  totalAvailable: number
}

export interface CalendarResult {
  hotelId: string
  roomTypeId: string | undefined
  year: number
  month: number
  days: CalendarDay[]
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export class GetAvailabilityCalendar {
  constructor(private readonly inventoryRepo: IInventoryRepository) {}

  async execute(dto: GetCalendarDto): Promise<CalendarResult> {
    const startDate = new Date(Date.UTC(dto.year, dto.month - 1, 1))
    const endDate = new Date(Date.UTC(dto.year, dto.month, 0)) // last day of month

    let records
    if (dto.roomTypeId) {
      records = await this.inventoryRepo.findByRoomTypeAndDateRange(
        dto.roomTypeId,
        startDate,
        endDate
      )
    } else {
      records = await this.inventoryRepo.findByHotelAndDateRange(
        dto.hotelId,
        startDate,
        endDate
      )
    }

    // Group by date then by roomTypeId
    const byDate = new Map<string, Map<string, {
      totalRooms: number
      reservedCount: number
      blockedCount: number
      availableCount: number
    }>>()

    for (const r of records) {
      const dateStr = formatDate(r.inventoryDate)
      if (!byDate.has(dateStr)) {
        byDate.set(dateStr, new Map())
      }
      const dateMap = byDate.get(dateStr)
      if (dateMap) {
        dateMap.set(r.roomTypeId, {
          totalRooms: r.totalRooms,
          reservedCount: r.reservedCount,
          blockedCount: r.blockedCount,
          availableCount: r.availableCount,
        })
      }
    }

    // Build calendar days array for every day of the month
    const days: CalendarDay[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dateStr = formatDate(current)
      const dateMap = byDate.get(dateStr) ?? new Map()
      const roomTypes = Array.from(dateMap.entries()).map(([roomTypeId, data]) => ({
        roomTypeId,
        ...data,
      }))
      const totalAvailable = roomTypes.reduce((sum, rt) => sum + rt.availableCount, 0)

      days.push({
        date: dateStr,
        dayOfWeek: current.getUTCDay(),
        roomTypes,
        totalAvailable,
      })

      current.setUTCDate(current.getUTCDate() + 1)
    }

    return {
      hotelId: dto.hotelId,
      roomTypeId: dto.roomTypeId,
      year: dto.year,
      month: dto.month,
      days,
    }
  }
}
