import { BlockInventory } from '../../application/use-cases/BlockInventory'
import { Inventory } from '../../domain/entities/Inventory'
import { BadRequestError, ConflictError } from '@stayflexi/shared-errors'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { IInventoryBlockRepository } from '../../domain/repositories/IInventoryBlockRepository'
import type { DistributedLockService } from '../../application/services/DistributedLockService'
import type { InventoryCache } from '../../application/services/InventoryCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { InventoryBlock } from '../../domain/entities/InventoryBlock'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeInventory(
  date: string,
  totalRooms = 10,
  reservedCount = 0,
  blockedCount = 0
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

function makeBlockRepo(): jest.Mocked<IInventoryBlockRepository> {
  return {
    create: jest.fn().mockResolvedValue({} as InventoryBlock),
    deactivateOldestByInventory: jest.fn(),
    findActiveByInventory: jest.fn(),
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

describe('BlockInventory', () => {
  let inventoryRepo: jest.Mocked<IInventoryRepository>
  let blockRepo: jest.Mocked<IInventoryBlockRepository>
  let lockService: jest.Mocked<DistributedLockService>
  let cache: jest.Mocked<InventoryCache>
  let useCase: BlockInventory

  beforeEach(() => {
    jest.clearAllMocks()
    inventoryRepo = makeInventoryRepo()
    blockRepo = makeBlockRepo()
    lockService = makeLockService()
    cache = makeCache()
    useCase = new BlockInventory(
      inventoryRepo,
      blockRepo,
      lockService,
      cache,
      mockPublisher,
      mockLogger
    )
  })

  it('blocks a date range and returns blocked dates', async () => {
    inventoryRepo.findOrCreate
      .mockResolvedValueOnce(makeInventory('2025-07-01'))
      .mockResolvedValueOnce(makeInventory('2025-07-02'))
      .mockResolvedValueOnce(makeInventory('2025-07-03'))
    inventoryRepo.incrementBlocked.mockImplementation(async (id) =>
      makeInventory('2025-07-01', 10, 0, 1)
    )

    const result = await useCase.execute(
      {
        roomTypeId: 'rt-1',
        hotelId: 'hotel-1',
        startDate: '2025-07-01',
        endDate: '2025-07-03',
        quantity: 1,
        reason: 'MAINTENANCE',
      },
      'org-1',
      'user-1',
      'corr-1'
    )

    expect(result.blockedDates).toHaveLength(3)
    expect(result.blockedDates).toContain('2025-07-01')
    expect(result.blockedDates).toContain('2025-07-03')
    expect(inventoryRepo.incrementBlocked).toHaveBeenCalledTimes(3)
    expect(blockRepo.create).toHaveBeenCalledTimes(3)
  })

  it('throws BadRequestError when endDate is before startDate', async () => {
    await expect(
      useCase.execute(
        {
          roomTypeId: 'rt-1',
          hotelId: 'hotel-1',
          startDate: '2025-07-05',
          endDate: '2025-07-01',
          quantity: 1,
          reason: 'MAINTENANCE',
        },
        'org-1',
        'user-1'
      )
    ).rejects.toThrow(BadRequestError)
  })

  it('throws ConflictError when no rooms are available to block', async () => {
    inventoryRepo.findOrCreate.mockResolvedValue(
      makeInventory('2025-07-01', 5, 3, 2) // 0 available
    )

    await expect(
      useCase.execute(
        {
          roomTypeId: 'rt-1',
          hotelId: 'hotel-1',
          startDate: '2025-07-01',
          endDate: '2025-07-01',
          quantity: 1,
          reason: 'MAINTENANCE',
        },
        'org-1',
        'user-1'
      )
    ).rejects.toThrow(ConflictError)

    expect(inventoryRepo.incrementBlocked).not.toHaveBeenCalled()
  })

  it('publishes inventory.blocked event (fire-and-forget)', async () => {
    inventoryRepo.findOrCreate.mockResolvedValue(makeInventory('2025-07-01'))
    inventoryRepo.incrementBlocked.mockResolvedValue(makeInventory('2025-07-01', 10, 0, 1))

    await useCase.execute(
      {
        roomTypeId: 'rt-1',
        hotelId: 'hotel-1',
        startDate: '2025-07-01',
        endDate: '2025-07-01',
        quantity: 1,
        reason: 'HOTEL_USE',
      },
      'org-1',
      'user-1',
      'corr-pub'
    )
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'inventory.events',
      expect.objectContaining({ eventType: 'inventory.blocked' })
    )
  })

  it('invalidates cache for each blocked date', async () => {
    inventoryRepo.findOrCreate.mockResolvedValue(makeInventory('2025-07-01'))
    inventoryRepo.incrementBlocked.mockResolvedValue(makeInventory('2025-07-01', 10, 0, 1))

    await useCase.execute(
      {
        roomTypeId: 'rt-1',
        hotelId: 'hotel-1',
        startDate: '2025-07-01',
        endDate: '2025-07-01',
        quantity: 1,
        reason: 'MAINTENANCE',
      },
      'org-1',
      'user-1'
    )

    expect(cache.invalidate).toHaveBeenCalledWith('rt-1', expect.any(Date))
  })
})
