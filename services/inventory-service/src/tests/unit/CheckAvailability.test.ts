import { CheckAvailability } from '../../application/use-cases/CheckAvailability'
import { Inventory } from '../../domain/entities/Inventory'
import { BadRequestError } from '@stayflexi/shared-errors'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeInventory(
  date: string,
  totalRooms: number,
  reservedCount: number,
  blockedCount: number
): Inventory {
  return new Inventory({
    id: `inv-${date}`,
    hotelId: 'hotel-1',
    organizationId: 'org-1',
    roomTypeId: 'rt-1',
    inventoryDate: new Date(`${date}T00:00:00.000Z`),
    totalRooms,
    reservedCount,
    blockedCount,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

// ─── Mock ────────────────────────────────────────────────────────────────────

function makeInventoryRepo(): jest.Mocked<IInventoryRepository> {
  return {
    findByRoomTypeAndDate: jest.fn(),
    findOrCreate: jest.fn(),
    findByRoomTypeAndDateRange: jest.fn(),
    findByHotelAndDateRange: jest.fn(),
    reserveDateRange: jest.fn(),
    incrementBlocked: jest.fn(),
    decrementBlocked: jest.fn(),
    updateTotalRooms: jest.fn(),
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CheckAvailability', () => {
  let inventoryRepo: jest.Mocked<IInventoryRepository>
  let useCase: CheckAvailability

  beforeEach(() => {
    jest.clearAllMocks()
    inventoryRepo = makeInventoryRepo()
    useCase = new CheckAvailability(inventoryRepo)
  })

  it('returns isAvailable=true when all nights have sufficient inventory', async () => {
    inventoryRepo.findByRoomTypeAndDateRange.mockResolvedValue([
      makeInventory('2025-06-01', 10, 2, 0),
      makeInventory('2025-06-02', 10, 3, 0),
      makeInventory('2025-06-03', 10, 1, 0),
    ])

    const result = await useCase.execute({
      roomTypeId: 'rt-1',
      hotelId: 'hotel-1',
      checkInDate: '2025-06-01',
      checkOutDate: '2025-06-04',
      quantity: 1,
    })

    expect(result.isAvailable).toBe(true)
    expect(result.nights).toBe(3)
    expect(result.minAvailableCount).toBe(7) // 10-3-0 = 7 for June 2
  })

  it('returns isAvailable=false when one night is fully booked', async () => {
    inventoryRepo.findByRoomTypeAndDateRange.mockResolvedValue([
      makeInventory('2025-06-01', 10, 2, 0),
      makeInventory('2025-06-02', 10, 10, 0), // fully booked
    ])

    const result = await useCase.execute({
      roomTypeId: 'rt-1',
      hotelId: 'hotel-1',
      checkInDate: '2025-06-01',
      checkOutDate: '2025-06-03',
      quantity: 1,
    })

    expect(result.isAvailable).toBe(false)
    expect(result.minAvailableCount).toBe(0)
  })

  it('treats dates with no inventory record as 0 available', async () => {
    inventoryRepo.findByRoomTypeAndDateRange.mockResolvedValue([
      makeInventory('2025-06-01', 10, 0, 0),
      // June 2 missing — no inventory initialized
    ])

    const result = await useCase.execute({
      roomTypeId: 'rt-1',
      hotelId: 'hotel-1',
      checkInDate: '2025-06-01',
      checkOutDate: '2025-06-03',
      quantity: 1,
    })

    expect(result.isAvailable).toBe(false)
    expect(result.dates).toHaveLength(2)
    expect(result.dates[1]?.availableCount).toBe(0)
  })

  it('accounts for blocked inventory in availability calculation', async () => {
    inventoryRepo.findByRoomTypeAndDateRange.mockResolvedValue([
      makeInventory('2025-06-01', 5, 0, 3), // 2 available
    ])

    const result = await useCase.execute({
      roomTypeId: 'rt-1',
      hotelId: 'hotel-1',
      checkInDate: '2025-06-01',
      checkOutDate: '2025-06-02',
      quantity: 2,
    })

    expect(result.isAvailable).toBe(true)
    expect(result.minAvailableCount).toBe(2)
  })

  it('returns isAvailable=false when quantity requested > available', async () => {
    inventoryRepo.findByRoomTypeAndDateRange.mockResolvedValue([
      makeInventory('2025-06-01', 5, 3, 1), // 1 available
    ])

    const result = await useCase.execute({
      roomTypeId: 'rt-1',
      hotelId: 'hotel-1',
      checkInDate: '2025-06-01',
      checkOutDate: '2025-06-02',
      quantity: 3,
    })

    expect(result.isAvailable).toBe(false)
  })

  it('throws BadRequestError when checkOut is not after checkIn', async () => {
    await expect(
      useCase.execute({
        roomTypeId: 'rt-1',
        hotelId: 'hotel-1',
        checkInDate: '2025-06-05',
        checkOutDate: '2025-06-01',
        quantity: 1,
      })
    ).rejects.toThrow(BadRequestError)
  })

  it('returns correct night count for the date range', async () => {
    inventoryRepo.findByRoomTypeAndDateRange.mockResolvedValue([])

    const result = await useCase.execute({
      roomTypeId: 'rt-1',
      hotelId: 'hotel-1',
      checkInDate: '2025-06-01',
      checkOutDate: '2025-06-08',
      quantity: 1,
    })

    expect(result.nights).toBe(7)
    expect(result.dates).toHaveLength(7)
  })
})
