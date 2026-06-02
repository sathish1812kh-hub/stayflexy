import { SendNotification } from '../../application/use-cases/SendNotification'
import type { INotificationRepository } from '../../domain/repositories/INotificationRepository'
import type { ITemplateRepository } from '../../domain/repositories/ITemplateRepository'
import type { ProviderFactory } from '../../providers/ProviderFactory'
import type { TemplateRenderer } from '../../templates/TemplateRenderer'
import type { NotificationCache } from '../../infrastructure/cache/NotificationCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import { Notification } from '../../domain/entities/Notification'
import type { NotificationProps } from '../../domain/entities/Notification'
import { NotificationTemplate } from '../../domain/entities/NotificationTemplate'
import type { NotificationTemplateProps } from '../../domain/entities/NotificationTemplate'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Flush all pending setImmediate callbacks and micro-tasks */
async function flushImmediate(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve))
}

function makeNotification(overrides?: Partial<NotificationProps>): Notification {
  const defaults: NotificationProps = {
    id: 'notif-1',
    organizationId: 'org-1',
    hotelId: null,
    notificationType: 'EMAIL',
    recipient: 'guest@hotel.com',
    subject: 'Welcome',
    message: 'Hello guest',
    deliveryStatus: 'PENDING',
    retryCount: 0,
    maxRetries: 3,
    scheduledAt: null,
    deliveredAt: null,
    failedReason: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  return new Notification({ ...defaults, ...overrides })
}

function makeTemplate(overrides?: Partial<NotificationTemplateProps>): NotificationTemplate {
  const defaults: NotificationTemplateProps = {
    id: 'tmpl-1',
    templateName: 'welcome-email',
    templateType: 'EMAIL',
    subjectTemplate: 'Hello {{name}}',
    bodyTemplate: 'Dear {{name}}, welcome to {{hotel}}!',
    variables: ['name', 'hotel'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  return new NotificationTemplate({ ...defaults, ...overrides })
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

  const templateRepo: jest.Mocked<ITemplateRepository> = {
    findById: jest.fn(),
    findByName: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  }

  const mockProvider = {
    channelType: 'EMAIL',
    send: jest.fn().mockResolvedValue({ success: true, providerMessageId: 'mock-id' }),
    validateRecipient: jest.fn().mockReturnValue(true),
  }

  const providerFactory = {
    getProvider: jest.fn().mockReturnValue(mockProvider),
    getSupportedChannels: jest.fn().mockReturnValue(['EMAIL']),
  } as unknown as jest.Mocked<ProviderFactory>

  const templateRenderer = {
    render: jest.fn((tmpl: string, vars: Record<string, string>) =>
      tmpl.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => vars[k] ?? `{{${k}}}`),
    ),
    renderNotification: jest.fn().mockReturnValue({
      body: 'Dear John, welcome to Grand Hotel!',
      subject: 'Hello John',
    }),
    validateVariables: jest.fn().mockReturnValue([]),
  } as unknown as jest.Mocked<TemplateRenderer>

  const cache: jest.Mocked<NotificationCache> = {
    getNotification: jest.fn().mockResolvedValue(null),
    setNotification: jest.fn().mockResolvedValue(undefined),
    invalidateNotification: jest.fn().mockResolvedValue(undefined),
    checkDedup: jest.fn().mockResolvedValue(false), // not a duplicate by default
    getRetryStatus: jest.fn().mockResolvedValue(null),
    setRetryStatus: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationCache>

  const eventPublisher: jest.Mocked<IEventPublisher> = {
    publish: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
  }

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
  } as unknown as Logger

  return {
    notificationRepo,
    templateRepo,
    providerFactory,
    templateRenderer,
    cache,
    eventPublisher,
    logger,
    mockProvider,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SendNotification', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('sends notification successfully', async () => {
    const { notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger } = makeMocks()
    const created = makeNotification({ deliveryStatus: 'PENDING' })
    notificationRepo.create.mockResolvedValue(created)
    notificationRepo.updateStatus.mockResolvedValue(makeNotification({ deliveryStatus: 'DELIVERED' }))

    const uc = new SendNotification(notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger)
    const result = await uc.execute({
      organizationId: 'org-1',
      notificationType: 'EMAIL',
      recipient: 'guest@hotel.com',
      message: 'Hello',
    })

    expect(notificationRepo.create).toHaveBeenCalledTimes(1)
    expect(result.id).toBe('notif-1')
    // Returned record is the PENDING one — delivery happens asynchronously
    expect(result.deliveryStatus).toBe('PENDING')
  })

  it('logs a warning but still creates notification when duplicate is detected', async () => {
    const { notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger } = makeMocks()
    cache.checkDedup.mockResolvedValue(true)
    const created = makeNotification({ deliveryStatus: 'PENDING' })
    notificationRepo.create.mockResolvedValue(created)

    const uc = new SendNotification(notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger)
    await uc.execute({
      organizationId: 'org-1',
      notificationType: 'EMAIL',
      recipient: 'guest@hotel.com',
      message: 'Hello',
    })

    // Notification is still created (audit trail)
    expect(notificationRepo.create).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: 'guest@hotel.com' }),
      'Duplicate notification suppressed',
    )
  })

  it('uses template when templateId is provided and template is active', async () => {
    const { notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger } = makeMocks()
    const tmpl = makeTemplate()
    templateRepo.findById.mockResolvedValue(tmpl)
    templateRenderer.renderNotification.mockReturnValue({
      body: 'Dear John, welcome to Grand Hotel!',
      subject: 'Hello John',
    })
    const created = makeNotification({ subject: 'Hello John', message: 'Dear John, welcome to Grand Hotel!' })
    notificationRepo.create.mockResolvedValue(created)

    const uc = new SendNotification(notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger)
    await uc.execute({
      organizationId: 'org-1',
      notificationType: 'EMAIL',
      recipient: 'guest@hotel.com',
      message: 'fallback message',
      templateId: 'tmpl-1',
      templateVariables: { name: 'John', hotel: 'Grand Hotel' },
    })

    expect(templateRepo.findById).toHaveBeenCalledWith('tmpl-1')
    expect(templateRenderer.renderNotification).toHaveBeenCalledWith(
      tmpl.bodyTemplate,
      tmpl.subjectTemplate,
      { name: 'John', hotel: 'Grand Hotel' },
    )
    const createCall = notificationRepo.create.mock.calls[0]
    expect(createCall).toBeDefined()
    if (createCall !== undefined) {
      expect(createCall[0]?.message).toBe('Dear John, welcome to Grand Hotel!')
    }
  })

  it('falls back to dto.message when templateId is provided but template is not found', async () => {
    const { notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger } = makeMocks()
    templateRepo.findById.mockResolvedValue(null)
    const created = makeNotification({ message: 'fallback message' })
    notificationRepo.create.mockResolvedValue(created)

    const uc = new SendNotification(notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger)
    await uc.execute({
      organizationId: 'org-1',
      notificationType: 'EMAIL',
      recipient: 'guest@hotel.com',
      message: 'fallback message',
      templateId: 'non-existent-tmpl',
    })

    expect(templateRenderer.renderNotification).not.toHaveBeenCalled()
    const createCall = notificationRepo.create.mock.calls[0]
    expect(createCall).toBeDefined()
    if (createCall !== undefined) {
      expect(createCall[0]?.message).toBe('fallback message')
    }
  })

  it('creates notification record with PENDING status before async delivery', async () => {
    const { notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger } = makeMocks()
    const created = makeNotification({ deliveryStatus: 'PENDING' })
    notificationRepo.create.mockResolvedValue(created)
    notificationRepo.updateStatus.mockResolvedValue(makeNotification({ deliveryStatus: 'DELIVERED' }))

    const uc = new SendNotification(notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger)
    const result = await uc.execute({
      organizationId: 'org-1',
      notificationType: 'EMAIL',
      recipient: 'guest@hotel.com',
      message: 'Hello',
    })

    // Synchronous return should be PENDING — delivery happens via setImmediate
    expect(result.deliveryStatus).toBe('PENDING')
  })

  it('does not call updateStatus for a scheduled notification', async () => {
    const { notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger } = makeMocks()
    const future = new Date(Date.now() + 60_000).toISOString()
    const created = makeNotification({ scheduledAt: new Date(future), deliveryStatus: 'PENDING' })
    notificationRepo.create.mockResolvedValue(created)

    const uc = new SendNotification(notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger)
    await uc.execute({
      organizationId: 'org-1',
      notificationType: 'EMAIL',
      recipient: 'guest@hotel.com',
      message: 'Scheduled message',
      scheduledAt: future,
    })

    // Flush setImmediate queue — delivery should NOT have been triggered
    await flushImmediate()

    expect(notificationRepo.updateStatus).not.toHaveBeenCalled()
  })

  it('fires notification.sent event on successful delivery', async () => {
    const { notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger } = makeMocks()
    const created = makeNotification({ deliveryStatus: 'PENDING' })
    notificationRepo.create.mockResolvedValue(created)
    notificationRepo.updateStatus
      .mockResolvedValueOnce(makeNotification({ deliveryStatus: 'QUEUED' }))
      .mockResolvedValueOnce(makeNotification({ deliveryStatus: 'DELIVERED' }))

    const uc = new SendNotification(notificationRepo, templateRepo, providerFactory, templateRenderer, cache, eventPublisher, logger)
    await uc.execute({
      organizationId: 'org-1',
      notificationType: 'EMAIL',
      recipient: 'guest@hotel.com',
      message: 'Hello',
    })

    // First flush triggers deliverNotification; second flushes the nested event publish setImmediate
    await flushImmediate()
    await flushImmediate()
    await flushImmediate()

    expect(eventPublisher.publish).toHaveBeenCalledWith(
      'notification.events',
      expect.objectContaining({ eventType: 'notification.sent' }),
    )
  })
})
