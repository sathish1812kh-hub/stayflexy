import { ReserveInventory } from '../../application/use-cases/ReserveInventory'
import { Inventory } from '../../domain/entities/Inventory'
import { BadRequestError, ConflictError, ServiceUnavailableError } from '@stayflexi/shared-errors'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { DistributedLockService } from '../../application/services/DistributedLockService'
import type { InventoryCache } from '../../application/services/InventoryCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeInventory(
  overrides: Partial<{ totalRooms: number; reservedCount: number; blockedCount: number }> = {}
): Inventory {
  return new Inventory({
    id: 'inv-1',
    hotelId: 'hotel-1',
    organizationId: 'org-1',
    roomTypeId: 'rt-1',
    inventoryDate: new Date('2025-06-01T00:00:00.000Z'),
    totalRooms: overrides.totalRooms ?? 10,
    reservedCount: overrides.reservedCount ?? 0,
    blockedCount: overrides.blockedCount ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

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

function makeLockService(): jest.Mocked<DistributedLockService> {
  return {
    acquire: jest.fn(),
    release: jest.fn(),
    withLock: jest.fn(),
    withMultipleLocks: jest.fn().mockImplementation(
      async (_names: string[], fn: () => Promise<unknown>) => fn()
    ),
  } as unknown as jest.Mocked<DistributedLockService>
}

function makeCache(): jest.Mocked<InventoryCache> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
    invalidateCalendar: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<InventoryCache>
}

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  isConnected: () => false,
}

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ReserveInventory', () => {
  let inventoryRepo: jest.Mocked<IInventoryRepository>
  let lockService: jest.Mocked<DistributedLockService>
  let cache: jest.Mocked<InventoryCache>
  let useCase: ReserveInventory

  beforeEach(() => {
    jest.clearAllMocks()
    inventoryRepo = makeInventoryRepo()
    lockService = makeLockService()
    cache = makeCache()
    useCase = new ReserveInventory(inventoryRepo, lockService, cache, mockPublisher, mockLogger)
  })

  it('reserves a 3-night stay and returns reservationIds', async () => {
    inventoryRepo.findOrCreate.mockResolvedValue(makeInventory())
    inventoryRepo.reserveDateRange.mockResolvedValue(['res-1', 'res-2', 'res-3'])

    const result = await useCase.execute(
      {
        roomTypeId: 'rt-1',
        hotelId: 'hotel-1',
        bookingRef: 'BK-001',
        checkInDate: '2025-06-01',
        checkOutDate: '2025-06-04',
        quantity: 1,
      },
      'org-1',
      'corr-1'
    )

    expect(result.nights).toBe(3)
    expect(result.reservationIds).toHaveLength(3)
    expect(inventoryRepo.findOrCreate).toHaveBeenCalledTimes(3)
    expect(inventoryRepo.reserveDateRange).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingRef: 'BK-001',
        roomTypeId: 'rt-1',
        quantity: 1,
      })
    )
  })

  it('throws BadRequestError when checkOut is not after checkIn', async () => {
    await expect(
      useCase.execute(
        {
          roomTypeId: 'rt-1',
          hotelId: 'hotel-1',
          bookingRef: 'BK-001',
          checkInDate: '2025-06-04',
          checkOutDate: '2025-06-01',
          quantity: 1,
        },
        'org-1'
      )
    ).rejects.toThrow(BadRequestError)

    expect(inventoryRepo.findOrCreate).not.toHaveBeenCalled()
  })

  it('throws BadRequestError when checkIn equals checkOut (0 nights)', async () => {
    await expect(
      useCase.execute(
        {
          roomTypeId: 'rt-1',
          hotelId: 'hotel-1',
          bookingRef: 'BK-001',
          checkInDate: '2025-06-01',
          checkOutDate: '2025-06-01',
          quantity: 1,
        },
        'org-1'
      )
    ).rejects.toThrow(BadRequestError)
  })

  it('throws ConflictError (overbooking) when available < quantity', async () => {
    inventoryRepo.findOrCreate.mockResolvedValue(
      makeInventory({ totalRooms: 2, reservedCount: 2, blockedCount: 0 })
    )

    await expect(
      useCase.execute(
        {
          roomTypeId: 'rt-1',
          hotelId: 'hotel-1',
          bookingRef: 'BK-002',
          checkInDate: '2025-06-01',
          checkOutDate: '2025-06-02',
          quantity: 1,
        },
        'org-1'
      )
    ).rejects.toThrow(ConflictError)

    expect(inventoryRepo.reserveDateRange).not.toHaveBeenCalled()
  })

  it('throws ConflictError when blocked inventory makes room unavailable', async () => {
    inventoryRepo.findOrCreate.mockResolvedValue(
      makeInventory({ totalRooms: 2, reservedCount: 0, blockedCount: 2 })
    )

    await expect(
      useCase.execute(
        {
          roomTypeId: 'rt-1',
          hotelId: 'hotel-1',
          bookingRef: 'BK-003',
          checkInDate: '2025-06-01',
          checkOutDate: '2025-06-02',
          quantity: 1,
        },
        'org-1'
      )
    ).rejects.toThrow(ConflictError)
  })

  it('throws ServiceUnavailableError when lock cannot be acquired', async () => {
    lockService.withMultipleLocks.mockImplementationOnce(() => {
      throw new ServiceUnavailableError('Could not acquire inventory lock')
    })

    await expect(
      useCase.execute(
        {
          roomTypeId: 'rt-1',
          hotelId: 'hotel-1',
          bookingRef: 'BK-004',
          checkInDate: '2025-06-01',
          checkOutDate: '2025-06-02',
          quantity: 1,
        },
        'org-1'
      )
    ).rejects.toThrow(ServiceUnavailableError)
  })

  it('invalidates cache for each date after successful reservation', async () => {
    inventoryRepo.findOrCreate.mockResolvedValue(makeInventory())
    inventoryRepo.reserveDateRange.mockResolvedValue(['res-1', 'res-2'])

    await useCase.execute(
      {
        roomTypeId: 'rt-1',
        hotelId: 'hotel-1',
        bookingRef: 'BK-005',
        checkInDate: '2025-06-01',
        checkOutDate: '2025-06-03',
        quantity: 1,
      },
      'org-1'
    )

    expect(cache.invalidate).toHaveBeenCalledTimes(2)
  })

  it('publishes inventory.reserved event (fire-and-forget)', async () => {
    inventoryRepo.findOrCreate.mockResolvedValue(makeInventory())
    inventoryRepo.reserveDateRange.mockResolvedValue(['res-1'])

    await useCase.execute(
      {
        roomTypeId: 'rt-1',
        hotelId: 'hotel-1',
        bookingRef: 'BK-006',
        checkInDate: '2025-06-01',
        checkOutDate: '2025-06-02',
        quantity: 1,
      },
      'org-1',
      'corr-pub'
    )
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'inventory.events',
      expect.objectContaining({
        eventType: 'inventory.reserved',
        organizationId: 'org-1',
      })
    )
  })

  it('acquires locks in sorted order to prevent deadlocks', async () => {
    inventoryRepo.findOrCreate.mockResolvedValue(makeInventory())
    inventoryRepo.reserveDateRange.mockResolvedValue(['res-1', 'res-2'])

    await useCase.execute(
      {
        roomTypeId: 'rt-1',
        hotelId: 'hotel-1',
        bookingRef: 'BK-007',
        checkInDate: '2025-06-03',
        checkOutDate: '2025-06-05',
        quantity: 1,
      },
      'org-1'
    )

    const lockNames = lockService.withMultipleLocks.mock.calls[0]?.[0] as string[]
    expect(lockNames).toBeDefined()
    if (lockNames) {
      const sorted = [...lockNames].sort()
      expect(lockNames).toEqual(sorted)
    }
  })
})
