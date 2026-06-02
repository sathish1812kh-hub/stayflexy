import { UpdateOrganization } from '../../application/use-cases/UpdateOrganization'
import { Organization } from '../../domain/entities/Organization'
import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { OrganizationCache } from '../../application/services/OrganizationCache'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeOrg(ownerId = 'owner-1', deletedAt: Date | null = null): Organization {
  return new Organization({
    id: 'org-1',
    name: 'Acme Hotels',
    legalName: null,
    slug: 'acme-hotels',
    plan: 'FREE',
    status: 'ACTIVE',
    email: 'admin@acme.com',
    phone: null,
    website: null,
    logoUrl: null,
    ownerId,
    country: 'US',
    maxHotels: 1,
    metadata: null,
    createdById: ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt,
  })
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

function makeOrgRepo(): jest.Mocked<IOrganizationRepository> {
  return {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findByOwnerId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setOwner: jest.fn(),
    softDelete: jest.fn(),
    findMany: jest.fn(),
  }
}

function makeCache(): jest.Mocked<OrganizationCache> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<OrganizationCache>
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

describe('UpdateOrganization', () => {
  let orgRepo: jest.Mocked<IOrganizationRepository>
  let cache: jest.Mocked<OrganizationCache>
  let useCase: UpdateOrganization

  beforeEach(() => {
    jest.clearAllMocks()
    orgRepo = makeOrgRepo()
    cache = makeCache()
    useCase = new UpdateOrganization(orgRepo, cache, mockPublisher, mockLogger)
  })

  it('updates org and invalidates cache', async () => {
    const updated = makeOrg()
    orgRepo.findById.mockResolvedValue(makeOrg())
    orgRepo.update.mockResolvedValue(updated)

    const result = await useCase.execute('org-1', { name: 'New Name' }, 'owner-1', null, 'corr-1')

    expect(orgRepo.update).toHaveBeenCalledWith('org-1', { name: 'New Name' })
    expect(cache.invalidate).toHaveBeenCalledWith('org-1')
    expect(result.id).toBe('org-1')
  })

  it('throws NotFoundError when org does not exist', async () => {
    orgRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute('org-1', { name: 'X' }, 'owner-1', null)
    ).rejects.toThrow(NotFoundError)

    expect(orgRepo.update).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when org is soft-deleted', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1', new Date()))

    await expect(
      useCase.execute('org-1', { name: 'X' }, 'owner-1', null)
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when requestingOrgId does not match', async () => {
    await expect(
      useCase.execute('org-1', { name: 'X' }, 'owner-1', 'org-999')
    ).rejects.toThrow(ForbiddenError)

    expect(orgRepo.findById).not.toHaveBeenCalled()
  })

  it('throws ForbiddenError when requester is not the owner', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))

    await expect(
      useCase.execute('org-1', { name: 'X' }, 'not-owner', null)
    ).rejects.toThrow(ForbiddenError)

    expect(orgRepo.update).not.toHaveBeenCalled()
  })

  it('publishes organization.updated event (fire-and-forget)', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg())
    orgRepo.update.mockResolvedValue(makeOrg())

    await useCase.execute('org-1', { name: 'New Name', email: 'new@acme.com' }, 'owner-1', null, 'corr-pub')
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'organization.events',
      expect.objectContaining({ eventType: 'organization.updated', organizationId: 'org-1' })
    )
  })

  it('does not throw when event publisher fails', async () => {
    ;(mockPublisher.publish as jest.Mock).mockRejectedValueOnce(new Error('Kafka down'))
    orgRepo.findById.mockResolvedValue(makeOrg())
    orgRepo.update.mockResolvedValue(makeOrg())

    await expect(
      useCase.execute('org-1', { name: 'X' }, 'owner-1', null)
    ).resolves.toBeDefined()
  })
})
