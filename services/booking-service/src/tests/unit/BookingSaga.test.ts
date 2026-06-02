import { BookingCreationSaga } from '../../sagas/BookingCreationSaga'
import type { IBookingRepository } from '../../domain/repositories/IBookingRepository'
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { BookingSagaContext } from '../../sagas/BookingCreationSaga'

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makeBookingRepo(): jest.Mocked<IBookingRepository> {
  return {
    findById: jest.fn(),
    findByIdWithDetails: jest.fn(),
    findByBookingNumber: jest.fn(),
    findByOrganization: jest.fn(),
    findOverlappingRoomBookings: jest.fn(),
    createWithDetails: jest.fn(),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    updateRoomStatuses: jest.fn().mockResolvedValue(undefined),
    addAuditEntry: jest.fn().mockResolvedValue(undefined),
  }
}

function makeInventoryRepo(): jest.Mocked<IInventoryRepository> {
  return {
    checkAvailability: jest.fn(),
    getAvailabilityForRange: jest.fn(),
    reserveInventory: jest.fn().mockResolvedValue(undefined),
    releaseInventory: jest.fn().mockResolvedValue(undefined),
  }
}

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: () => false,
}

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

const sagaCtx: BookingSagaContext = {
  bookingId: 'booking-1',
  hotelId: 'hotel-1',
  organizationId: 'org-1',
  roomTypeIds: ['rt-1', 'rt-2'],
  checkInDate: new Date('2026-07-01'),
  checkOutDate: new Date('2026-07-05'),
  correlationId: 'corr-saga',
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BookingCreationSaga', () => {
  let bookingRepo: jest.Mocked<IBookingRepository>
  let inventoryRepo: jest.Mocked<IInventoryRepository>
  let saga: BookingCreationSaga

  beforeEach(() => {
    jest.clearAllMocks()
    bookingRepo = makeBookingRepo()
    inventoryRepo = makeInventoryRepo()
    saga = new BookingCreationSaga(bookingRepo, inventoryRepo, mockPublisher, mockLogger)
  })

  it('executes all steps successfully for multiple room types', async () => {
    await saga.execute(sagaCtx)

    expect(inventoryRepo.reserveInventory).toHaveBeenCalledTimes(2)
    expect(inventoryRepo.reserveInventory).toHaveBeenCalledWith(
      'rt-1', 'org-1', 'hotel-1',
      sagaCtx.checkInDate, sagaCtx.checkOutDate
    )
    expect(inventoryRepo.reserveInventory).toHaveBeenCalledWith(
      'rt-2', 'org-1', 'hotel-1',
      sagaCtx.checkInDate, sagaCtx.checkOutDate
    )
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'booking.events',
      expect.objectContaining({ eventType: 'booking.created', aggregateId: 'booking-1' })
    )
  })

  it('compensates by releasing inventory and cancelling booking when reserve fails', async () => {
    inventoryRepo.reserveInventory
      .mockResolvedValueOnce(undefined)   // rt-1 succeeds
      .mockRejectedValueOnce(new Error('Inventory service unavailable')) // rt-2 fails

    await expect(saga.execute(sagaCtx)).rejects.toThrow('Inventory service unavailable')

    // Compensation: release rt-1 (the one that succeeded)
    expect(inventoryRepo.releaseInventory).toHaveBeenCalledWith(
      'rt-1',
      sagaCtx.checkInDate,
      sagaCtx.checkOutDate
    )
    // Booking should be cancelled
    expect(bookingRepo.updateStatus).toHaveBeenCalledWith(
      'booking-1',
      'CANCELLED',
      expect.objectContaining({ cancellationNote: 'Inventory reservation failed' })
    )
  })

  it('compensates when event publishing fails after inventory was reserved', async () => {
    ;(mockPublisher.publish as jest.Mock).mockRejectedValueOnce(new Error('Kafka down'))

    // Note: since PublishEvent step compensate is no-op, we check that inventory
    // compensation from ReserveInventory step is NOT called (events were already fully reserved)
    // The saga fails on the publish step - compensation for publish is no-op
    await expect(saga.execute(sagaCtx)).rejects.toThrow('Kafka down')

    // inventory release NOT called (only inventory step was compensated, but publish step
    // failed — compensation runs for already-executed steps in reverse)
    // ReserveInventory ran and succeeded, then PublishEvent failed.
    // Compensation reverses: first PublishEvent.compensate (no-op), then ReserveInventory.compensate
    expect(inventoryRepo.releaseInventory).toHaveBeenCalledTimes(2) // both room types
    expect(bookingRepo.updateStatus).toHaveBeenCalledWith(
      'booking-1',
      'CANCELLED',
      expect.any(Object)
    )
  })

  it('handles empty roomTypeIds gracefully', async () => {
    const emptyCtx: BookingSagaContext = { ...sagaCtx, roomTypeIds: [] }

    await saga.execute(emptyCtx)

    expect(inventoryRepo.reserveInventory).not.toHaveBeenCalled()
    expect(mockPublisher.publish).toHaveBeenCalled()
  })

  it('logs saga step execution', async () => {
    await saga.execute(sagaCtx)

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ step: 'ReserveInventory', bookingId: 'booking-1' }),
      expect.any(String)
    )
  })
})
