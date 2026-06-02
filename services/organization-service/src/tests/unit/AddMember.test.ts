import { AddMember } from '../../application/use-cases/AddMember'
import { Organization } from '../../domain/entities/Organization'
import { Member } from '../../domain/entities/Member'
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '@stayflexi/shared-errors'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeOrg(ownerId = 'owner-1'): Organization {
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
    deletedAt: null,
  })
}

function makeMember(overrides: Partial<{ id: string; userId: string; isOwner: boolean; removedAt: Date | null }> = {}): Member {
  return new Member({
    id: overrides.id ?? 'mem-1',
    organizationId: 'org-1',
    userId: overrides.userId ?? 'user-1',
    isOwner: overrides.isOwner ?? false,
    joinedAt: new Date(),
    removedAt: overrides.removedAt ?? null,
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

function makeMemberRepo(): jest.Mocked<IMemberRepository> {
  return {
    findByOrgAndUser: jest.fn(),
    findActiveByOrg: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    countActiveByOrg: jest.fn(),
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

describe('AddMember', () => {
  let orgRepo: jest.Mocked<IOrganizationRepository>
  let memberRepo: jest.Mocked<IMemberRepository>
  let useCase: AddMember

  beforeEach(() => {
    jest.clearAllMocks()
    orgRepo = makeOrgRepo()
    memberRepo = makeMemberRepo()
    useCase = new AddMember(orgRepo, memberRepo, mockPublisher, mockLogger)
  })

  it('adds a new member and returns the Member entity', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.countActiveByOrg.mockResolvedValue(5)
    memberRepo.findByOrgAndUser.mockResolvedValue(null)
    memberRepo.create.mockResolvedValue(makeMember({ userId: 'new-user' }))

    const result = await useCase.execute('org-1', { userId: 'new-user' }, 'owner-1', 'corr-1')

    expect(memberRepo.create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: 'new-user',
      isOwner: false,
    })
    expect(result.userId).toBe('user-1') // fixture default
  })

  it('throws NotFoundError when org does not exist', async () => {
    orgRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute('org-1', { userId: 'new-user' }, 'owner-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when org is soft-deleted', async () => {
    const deleted = new Organization({
      id: 'org-1', name: 'X', legalName: null, slug: 'x', plan: 'FREE', status: 'ACTIVE',
      email: 'x@x.com', phone: null, website: null, logoUrl: null,
      ownerId: 'owner-1', country: 'US', maxHotels: 1, metadata: null,
      createdById: null, createdAt: new Date(), updatedAt: new Date(),
      deletedAt: new Date(),
    })
    orgRepo.findById.mockResolvedValue(deleted)

    await expect(
      useCase.execute('org-1', { userId: 'new-user' }, 'owner-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when requester is not the owner', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))

    await expect(
      useCase.execute('org-1', { userId: 'new-user' }, 'not-owner')
    ).rejects.toThrow(ForbiddenError)

    expect(memberRepo.create).not.toHaveBeenCalled()
  })

  it('throws BadRequestError when member limit is reached', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.countActiveByOrg.mockResolvedValue(500)

    await expect(
      useCase.execute('org-1', { userId: 'new-user' }, 'owner-1')
    ).rejects.toThrow(BadRequestError)
  })

  it('throws ConflictError when user is already an active member', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.countActiveByOrg.mockResolvedValue(2)
    memberRepo.findByOrgAndUser.mockResolvedValue(makeMember({ userId: 'existing-user' }))

    await expect(
      useCase.execute('org-1', { userId: 'existing-user' }, 'owner-1')
    ).rejects.toThrow(ConflictError)
  })

  it('publishes member.added event (fire-and-forget)', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.countActiveByOrg.mockResolvedValue(1)
    memberRepo.findByOrgAndUser.mockResolvedValue(null)
    memberRepo.create.mockResolvedValue(makeMember())

    await useCase.execute('org-1', { userId: 'new-user' }, 'owner-1', 'corr-abc')
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'organization.events',
      expect.objectContaining({ eventType: 'organization.member.added', organizationId: 'org-1' })
    )
  })

  it('does not throw when event publisher fails', async () => {
    ;(mockPublisher.publish as jest.Mock).mockRejectedValueOnce(new Error('Kafka down'))
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.countActiveByOrg.mockResolvedValue(1)
    memberRepo.findByOrgAndUser.mockResolvedValue(null)
    memberRepo.create.mockResolvedValue(makeMember())

    await expect(
      useCase.execute('org-1', { userId: 'new-user' }, 'owner-1')
    ).resolves.toBeDefined()
  })
})
