import { NotificationRetryWorker } from '../../workers/NotificationRetryWorker'
import type { INotificationRepository } from '../../domain/repositories/INotificationRepository'
import type { ProviderFactory } from '../../providers/ProviderFactory'
import type { Logger } from '@stayflexi/shared-logger'
import { Notification } from '../../domain/entities/Notification'
import type { NotificationProps } from '../../domain/entities/Notification'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNotification(overrides?: Partial<NotificationProps>): Notification {
  const defaults: NotificationProps = {
    id: 'notif-retry-1',
    organizationId: 'org-1',
    hotelId: null,
    notificationType: 'EMAIL',
    recipient: 'guest@hotel.com',
    subject: 'Test',
    message: 'Test message',
    deliveryStatus: 'FAILED',
    retryCount: 1,
    maxRetries: 3,
    scheduledAt: null,
    deliveredAt: null,
    failedReason: 'Previous failure',
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  return new Notification({ ...defaults, ...overrides })
}

function makeMocks() {
  const notificationRepo: jest.Mocked<INotificationRepository> = {
    findById: jest.fn(),
    findByOrganization: jest.fn(),
    findFailedForRetry: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    incrementRetry: jest.fn(),
  }

  const mockProvider = {
    channelType: 'EMAIL',
    send: jest.fn().mockResolvedValue({ success: true, providerMessageId: 'mock-id' }),
    validateRecipient: jest.fn().mockReturnValue(true),
  }

  const providerFactory = {
    getProvider: jest.fn().mockReturnValue(mockProvider),
    getSupportedChannels: jest.fn(),
  } as unknown as jest.Mocked<ProviderFactory>

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as Logger

  return { notificationRepo, providerFactory, logger, mockProvider }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
// We test processRetries() indirectly by calling it via a tiny interval,
// then checking interactions after the Promise resolves.

describe('NotificationRetryWorker', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('processes failed notifications for retry', async () => {
    const { notificationRepo, providerFactory, logger } = makeMocks()
    const failedNotif = makeNotification({ retryCount: 1, maxRetries: 3 })
    notificationRepo.findFailedForRetry.mockResolvedValue([failedNotif])
    notificationRepo.incrementRetry.mockResolvedValue(makeNotification({ retryCount: 2 }))
    notificationRepo.updateStatus.mockResolvedValue(makeNotification({ deliveryStatus: 'DELIVERED' }))

    // Use a very short interval so we can await the first tick
    const worker = new NotificationRetryWorker(notificationRepo, providerFactory, logger, 10)
    worker.start()

    // Wait enough time for the interval to fire and the async processing to complete
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
    worker.stop()

    expect(notificationRepo.findFailedForRetry).toHaveBeenCalledWith(20)
    expect(notificationRepo.incrementRetry).toHaveBeenCalledWith('notif-retry-1')
  })

  it('marks notification DELIVERED on successful provider response', async () => {
    const { notificationRepo, providerFactory, logger, mockProvider } = makeMocks()
    const failedNotif = makeNotification({ retryCount: 1, maxRetries: 3 })
    notificationRepo.findFailedForRetry.mockResolvedValue([failedNotif])
    notificationRepo.incrementRetry.mockResolvedValue(makeNotification({ retryCount: 2 }))
    notificationRepo.updateStatus
      .mockResolvedValueOnce(makeNotification({ deliveryStatus: 'QUEUED' }))
      .mockResolvedValueOnce(makeNotification({ deliveryStatus: 'DELIVERED' }))
    mockProvider.send.mockResolvedValue({ success: true, providerMessageId: 'msg-ok' })

    const worker = new NotificationRetryWorker(notificationRepo, providerFactory, logger, 10)
    worker.start()
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
    worker.stop()

    expect(notificationRepo.updateStatus).toHaveBeenCalledWith(
      'notif-retry-1',
      'DELIVERED',
      expect.objectContaining({ deliveredAt: expect.any(Date) }),
    )
  })

  it('marks notification FAILED when provider returns an error response', async () => {
    const { notificationRepo, providerFactory, logger, mockProvider } = makeMocks()
    const failedNotif = makeNotification({ retryCount: 1, maxRetries: 3 })
    notificationRepo.findFailedForRetry.mockResolvedValue([failedNotif])
    notificationRepo.incrementRetry.mockResolvedValue(makeNotification({ retryCount: 2 }))
    notificationRepo.updateStatus.mockResolvedValue(makeNotification({ deliveryStatus: 'QUEUED' }))
    mockProvider.send.mockResolvedValue({ success: false, errorMessage: 'SMTP timeout' })

    const worker = new NotificationRetryWorker(notificationRepo, providerFactory, logger, 10)
    worker.start()
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
    worker.stop()

    expect(notificationRepo.updateStatus).toHaveBeenCalledWith(
      'notif-retry-1',
      'FAILED',
      expect.objectContaining({ failedReason: 'SMTP timeout' }),
    )
  })

  it('skips processing when findFailedForRetry returns empty list (all retries exhausted)', async () => {
    const { notificationRepo, providerFactory, logger } = makeMocks()
    // Repository filters retryCount < maxRetries; returns empty when all are exhausted
    notificationRepo.findFailedForRetry.mockResolvedValue([])

    const worker = new NotificationRetryWorker(notificationRepo, providerFactory, logger, 10)
    worker.start()
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
    worker.stop()

    expect(notificationRepo.findFailedForRetry).toHaveBeenCalled()
    expect(notificationRepo.incrementRetry).not.toHaveBeenCalled()
    expect(providerFactory.getProvider).not.toHaveBeenCalled()
  })
})
