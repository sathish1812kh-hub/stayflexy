import { GetNotification } from '../../application/use-cases/GetNotification'
import { ListNotifications } from '../../application/use-cases/ListNotifications'
import { RetryNotification } from '../../application/use-cases/RetryNotification'
import type { INotificationRepository } from '../../domain/repositories/INotificationRepository'
import type { ProviderFactory } from '../../providers/ProviderFactory'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import { Notification } from '../../domain/entities/Notification'
import type { NotificationProps } from '../../domain/entities/Notification'
import { ForbiddenError, NotFoundError } from '@stayflexi/shared-errors'

function makeNotification(overrides?: Partial<NotificationProps>): Notification {
  return new Notification({
    id: 'notif-1',
    organizationId: 'org-1',
    hotelId: 'hotel-1',
    notificationType: 'EMAIL',
    recipient: 'guest@hotel.com',
    subject: 'Test',
    message: 'Hello',
    deliveryStatus: 'FAILED',
    retryCount: 1,
    maxRetries: 3,
    scheduledAt: null,
    deliveredAt: null,
    failedReason: 'SMTP error',
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })
}

function makeRepo(): jest.Mocked<INotificationRepository> {
  return {
    findById: jest.fn(),
    findByOrganization: jest.fn(),
    findFailedForRetry: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    incrementRetry: jest.fn(),
  }
}

function makeLogger(): Logger {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as Logger
}

function makeEventPublisher(): jest.Mocked<IEventPublisher> {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
  }
}

// ─── GetNotification ─────────────────────────────────────────────────────────

describe('GetNotification — tenant isolation', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns notification when organizationId matches', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(makeNotification())
    const uc = new GetNotification(repo)

    const result = await uc.execute('notif-1', 'org-1')
    expect(result.id).toBe('notif-1')
  })

  it('throws ForbiddenError when organizationId does not match', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(makeNotification({ organizationId: 'org-1' }))
    const uc = new GetNotification(repo)

    await expect(uc.execute('notif-1', 'org-EVIL')).rejects.toThrow(ForbiddenError)
  })

  it('throws NotFoundError when notification does not exist', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(null)
    const uc = new GetNotification(repo)

    await expect(uc.execute('notif-missing', 'org-1')).rejects.toThrow(NotFoundError)
  })
})

// ─── ListNotifications ───────────────────────────────────────────────────────

describe('ListNotifications — tenant isolation', () => {
  afterEach(() => jest.clearAllMocks())

  it('passes organizationId as the scope filter to the repository', async () => {
    const repo = makeRepo()
    repo.findByOrganization.mockResolvedValue({ data: [], total: 0 })
    const uc = new ListNotifications(repo)

    await uc.execute('org-1', { page: 1, limit: 10 })

    expect(repo.findByOrganization).toHaveBeenCalledWith('org-1', { page: 1, limit: 10 })
  })

  it('returns empty list when organization has no notifications', async () => {
    const repo = makeRepo()
    repo.findByOrganization.mockResolvedValue({ data: [], total: 0 })
    const uc = new ListNotifications(repo)

    const result = await uc.execute('org-empty', {})
    expect(result.data).toHaveLength(0)
    expect(result.meta.total).toBe(0)
  })

  it('never leaks notifications from another organization', async () => {
    const repo = makeRepo()
    const org1Notif = makeNotification({ id: 'n-org1', organizationId: 'org-1' })
    repo.findByOrganization.mockImplementation(async (orgId) => {
      if (orgId === 'org-1') return { data: [org1Notif], total: 1 }
      return { data: [], total: 0 }
    })
    const uc = new ListNotifications(repo)

    const resultOrg2 = await uc.execute('org-2', {})
    expect(resultOrg2.data).toHaveLength(0)

    const resultOrg1 = await uc.execute('org-1', {})
    expect(resultOrg1.data).toHaveLength(1)
    expect(resultOrg1.data[0]?.organizationId).toBe('org-1')
  })
})

// ─── RetryNotification — tenant isolation ────────────────────────────────────

describe('RetryNotification — tenant isolation', () => {
  afterEach(() => jest.clearAllMocks())

  it('throws ForbiddenError when retrying a notification from another org', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(makeNotification({ organizationId: 'org-1' }))

    const mockProvider = {
      channelType: 'EMAIL',
      send: jest.fn(),
      validateRecipient: jest.fn().mockReturnValue(true),
    }
    const providerFactory = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
    } as unknown as jest.Mocked<ProviderFactory>

    const uc = new RetryNotification(repo, providerFactory, makeEventPublisher(), makeLogger())
    await expect(uc.execute('notif-1', 'org-EVIL')).rejects.toThrow(ForbiddenError)
    expect(repo.updateStatus).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when notification id does not exist', async () => {
    const repo = makeRepo()
    repo.findById.mockResolvedValue(null)

    const providerFactory = { getProvider: jest.fn() } as unknown as jest.Mocked<ProviderFactory>
    const uc = new RetryNotification(repo, providerFactory, makeEventPublisher(), makeLogger())

    await expect(uc.execute('no-such-id', 'org-1')).rejects.toThrow(NotFoundError)
  })
})
