import { CreateOrganization } from '../../application/use-cases/CreateOrganization'
import { Organization } from '../../domain/entities/Organization'
import { ConflictError } from '@stayflexi/shared-errors'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { Member } from '../../domain/entities/Member'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeOrg = (): Organization =>
  new Organization({
    id: 'org-123',
    name: 'Test Hotel Group',
    legalName: null,
    slug: 'test-hotel-group',
    plan: 'FREE',
    status: 'ACTIVE',
    email: 'admin@test.com',
    phone: null,
    website: null,
    logoUrl: null,
    ownerId: 'user-123',
    country: 'US',
    maxHotels: 1,
    metadata: null,
    createdById: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  })

const makeMember = (): Member =>
  ({
    id: 'member-1',
    organizationId: 'org-123',
    userId: 'user-123',
    isOwner: true,
    joinedAt: new Date(),
    removedAt: null,
    isActive: true,
    toJSON: jest.fn(),
  }) as unknown as Member

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockOrgRepo: jest.Mocked<IOrganizationRepository> = {
  findById: jest.fn(),
  findBySlug: jest.fn(),
  findByOwnerId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  findMany: jest.fn(),
}

const mockMemberRepo: jest.Mocked<IMemberRepository> = {
  findByOrgAndUser: jest.fn(),
  findActiveByOrg: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  countActiveByOrg: jest.fn(),
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

describe('CreateOrganization', () => {
  let useCase: CreateOrganization

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new CreateOrganization(mockOrgRepo, mockMemberRepo, mockPublisher, mockLogger)
  })

  it('creates an organization successfully and returns the entity', async () => {
    mockOrgRepo.findBySlug.mockResolvedValue(null)
    mockOrgRepo.findByOwnerId.mockResolvedValue(null)
    mockOrgRepo.create.mockResolvedValue(makeOrg())
    mockMemberRepo.create.mockResolvedValue(makeMember())

    const result = await useCase.execute(
      { name: 'Test Hotel Group', email: 'admin@test.com', country: 'US' },
      'user-123'
    )

    expect(result.id).toBe('org-123')
    expect(result.ownerId).toBe('user-123')
    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'user-123', slug: 'test-hotel-group' })
    )
    expect(mockMemberRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ isOwner: true, organizationId: 'org-123' })
    )
  })

  it('throws ConflictError when the generated slug is already taken', async () => {
    mockOrgRepo.findBySlug.mockResolvedValue(makeOrg())

    await expect(
      useCase.execute(
        { name: 'Test Hotel Group', email: 'admin@test.com', country: 'US' },
        'user-123'
      )
    ).rejects.toThrow(ConflictError)

    expect(mockOrgRepo.create).not.toHaveBeenCalled()
  })

  it('throws ConflictError when user already owns an organization', async () => {
    mockOrgRepo.findBySlug.mockResolvedValue(null)
    mockOrgRepo.findByOwnerId.mockResolvedValue(makeOrg())

    await expect(
      useCase.execute(
        { name: 'Another Org', email: 'admin2@test.com', country: 'US' },
        'user-123'
      )
    ).rejects.toThrow(ConflictError)

    expect(mockOrgRepo.create).not.toHaveBeenCalled()
  })

  it('generates a slug from the name when no slug is provided', async () => {
    mockOrgRepo.findBySlug.mockResolvedValue(null)
    mockOrgRepo.findByOwnerId.mockResolvedValue(null)
    mockOrgRepo.create.mockResolvedValue(makeOrg())
    mockMemberRepo.create.mockResolvedValue(makeMember())

    await useCase.execute(
      { name: 'My Hotel Group!', email: 'admin@test.com', country: 'US' },
      'user-123'
    )

    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'my-hotel-group' })
    )
  })

  it('uses the explicitly provided slug when present', async () => {
    mockOrgRepo.findBySlug.mockResolvedValue(null)
    mockOrgRepo.findByOwnerId.mockResolvedValue(null)
    mockOrgRepo.create.mockResolvedValue(makeOrg())
    mockMemberRepo.create.mockResolvedValue(makeMember())

    await useCase.execute(
      { name: 'My Hotel Group', slug: 'custom-slug', email: 'admin@test.com', country: 'US' },
      'user-123'
    )

    expect(mockOrgRepo.findBySlug).toHaveBeenCalledWith('custom-slug')
    expect(mockOrgRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'custom-slug' })
    )
  })

  it('publishes the organization.created event (fire-and-forget)', async () => {
    mockOrgRepo.findBySlug.mockResolvedValue(null)
    mockOrgRepo.findByOwnerId.mockResolvedValue(null)
    mockOrgRepo.create.mockResolvedValue(makeOrg())
    mockMemberRepo.create.mockResolvedValue(makeMember())

    await useCase.execute(
      { name: 'Test Hotel Group', email: 'admin@test.com', country: 'US' },
      'user-123',
      'corr-xyz'
    )

    // Allow micro-task queue to flush
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'organization.events',
      expect.objectContaining({
        eventType: 'organization.created',
        organizationId: 'org-123',
      })
    )
  })

  it('does NOT throw if the event publisher fails', async () => {
    ;(mockPublisher.publish as jest.Mock).mockRejectedValueOnce(
      new Error('Kafka down')
    )
    mockOrgRepo.findBySlug.mockResolvedValue(null)
    mockOrgRepo.findByOwnerId.mockResolvedValue(null)
    mockOrgRepo.create.mockResolvedValue(makeOrg())
    mockMemberRepo.create.mockResolvedValue(makeMember())

    await expect(
      useCase.execute(
        { name: 'Test Hotel Group', email: 'admin@test.com', country: 'US' },
        'user-123'
      )
    ).resolves.toBeDefined()
  })
})
