import { RemoveMember } from '../../application/use-cases/RemoveMember'
import { Organization } from '../../domain/entities/Organization'
import { Member } from '../../domain/entities/Member'
import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
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

function makeMember(userId = 'member-user', removedAt: Date | null = null): Member {
  return new Member({
    id: 'mem-1',
    organizationId: 'org-1',
    userId,
    isOwner: false,
    joinedAt: new Date(),
    removedAt,
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
    remove: jest.fn().mockResolvedValue(undefined),
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

describe('RemoveMember', () => {
  let orgRepo: jest.Mocked<IOrganizationRepository>
  let memberRepo: jest.Mocked<IMemberRepository>
  let useCase: RemoveMember

  beforeEach(() => {
    jest.clearAllMocks()
    orgRepo = makeOrgRepo()
    memberRepo = makeMemberRepo()
    useCase = new RemoveMember(orgRepo, memberRepo, mockPublisher, mockLogger)
  })

  it('removes an active member and returns void', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.findByOrgAndUser.mockResolvedValue(makeMember('member-user'))

    await expect(
      useCase.execute('org-1', 'member-user', 'owner-1', 'corr-1')
    ).resolves.toBeUndefined()

    expect(memberRepo.remove).toHaveBeenCalledWith('org-1', 'member-user')
  })

  it('throws NotFoundError when org does not exist', async () => {
    orgRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute('org-1', 'member-user', 'owner-1')
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
      useCase.execute('org-1', 'member-user', 'owner-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when requester is not the owner', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))

    await expect(
      useCase.execute('org-1', 'member-user', 'not-owner')
    ).rejects.toThrow(ForbiddenError)

    expect(memberRepo.remove).not.toHaveBeenCalled()
  })

  it('throws BadRequestError when owner tries to remove themselves', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))

    await expect(
      useCase.execute('org-1', 'owner-1', 'owner-1')
    ).rejects.toThrow(BadRequestError)

    expect(memberRepo.remove).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when target user is not an active member', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.findByOrgAndUser.mockResolvedValue(makeMember('member-user', new Date()))

    await expect(
      useCase.execute('org-1', 'member-user', 'owner-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when target user has no membership record', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.findByOrgAndUser.mockResolvedValue(null)

    await expect(
      useCase.execute('org-1', 'ghost-user', 'owner-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('publishes member.removed event (fire-and-forget)', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.findByOrgAndUser.mockResolvedValue(makeMember('member-user'))

    await useCase.execute('org-1', 'member-user', 'owner-1', 'corr-xyz')
    await Promise.resolve()

    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'organization.events',
      expect.objectContaining({ eventType: 'organization.member.removed', organizationId: 'org-1' })
    )
  })

  it('does not throw when event publisher fails', async () => {
    ;(mockPublisher.publish as jest.Mock).mockRejectedValueOnce(new Error('Kafka down'))
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.findByOrgAndUser.mockResolvedValue(makeMember('member-user'))

    await expect(
      useCase.execute('org-1', 'member-user', 'owner-1')
    ).resolves.toBeUndefined()
  })
})
