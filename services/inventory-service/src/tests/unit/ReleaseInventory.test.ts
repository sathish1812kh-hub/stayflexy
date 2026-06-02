import { ReleaseInventory } from '../../application/use-cases/ReleaseInventory'
import { BadRequestError } from '@stayflexi/shared-errors'
import type { IInventoryReservationRepository } from '../../domain/repositories/IInventoryReservationRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makeReservationRepo(): jest.Mocked<IInventoryReservationRepository> {
  return {
    findByBookingRef: jest.fn(),
    releaseByBookingRef: jest.fn(),
    countActiveByBookingRef: jest.fn(),
  }
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

describe('ReleaseInventory', () => {
  let reservationRepo: jest.Mocked<IInventoryReservationRepository>
  let useCase: ReleaseInventory

  beforeEach(() => {
    jest.clearAllMocks()
    reservationRepo = makeReservationRepo()
    useCase = new ReleaseInventory(reservationRepo, mockPublisher, mockLogger)
  })

  it('releases active reservations and returns count', async () => {
    reservationRepo.countActiveByBookingRef.mockResolvedValue(3)
    reservationRepo.releaseByBookingRef.mockResolvedValue(3)

    const result = await useCase.execute(
      { bookingRef: 'BK-001', hotelId: 'hotel-1' },
      'org-1',
      'corr-1'
    )

    expect(reservationRepo.releaseByBookingRef).toHaveBeenCalledWith('BK-001', 'org-1')
    expect(result.releasedCount).toBe(3)
    expect(result.bookingRef).toBe('BK-001')
  })

  it('throws BadRequestError when no active reservations exist', async () => {
    reservationRepo.countActiveByBookingRef.mockResolvedValue(0)

    await expect(
      useCase.execute({ bookingRef: 'BK-NOT-FOUND', hotelId: 'hotel-1' }, 'org-1')
    ).rejects.toThrow(BadRequestError)

    expect(reservationRepo.releaseByBookingRef).not.toHaveBeenCalled()
  })

  it('publishes inventory.released event (fire-and-forget)', async () => {
    reservationRepo.countActiveByBookingRef.mockResolvedValue(2)
    reservationRepo.releaseByBookingRef.mockResolvedValue(2)

    await useCase.execute(
      { bookingRef: 'BK-002', hotelId: 'hotel-1' },
      'org-1',
      'corr-pub'
    )
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'inventory.events',
      expect.objectContaining({
        eventType: 'inventory.released',
        organizationId: 'org-1',
      })
    )
  })

  it('does not throw when event publisher fails', async () => {
    ;(mockPublisher.publish as jest.Mock).mockRejectedValueOnce(new Error('Kafka down'))
    reservationRepo.countActiveByBookingRef.mockResolvedValue(1)
    reservationRepo.releaseByBookingRef.mockResolvedValue(1)

    await expect(
      useCase.execute({ bookingRef: 'BK-003', hotelId: 'hotel-1' }, 'org-1')
    ).resolves.toBeDefined()
  })
})
